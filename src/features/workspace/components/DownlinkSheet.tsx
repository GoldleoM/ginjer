import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import { authenticatedGraphql } from '../../../services/graphql';
import { useResponsiveLayout } from '../../../layout/responsive';
import { createDownlinkApi, controllerValue, downlinkAction, type DownlinkApi, type DownlinkDraft, type DownlinkOptions, type DownlinkResult } from '../services/downlinks';
import { ActionIcon, Feedback } from './WorkspaceUI';

const liveApi = createDownlinkApi(authenticatedGraphql);
const classes = [{ id: 'CLASS_A', name: 'Class A' }, { id: 'CLASS_B', name: 'Class B' }, { id: 'CLASS_C', name: 'Class C' }];
function SelectField({ label, value, items, onChange, disabled }: { label: string; value: string; items: { id: string; name: string }[]; onChange: (id: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => { Keyboard.dismiss(); setOpen(current => !current); }} style={styles.select}>
      <Text style={styles.fieldValue}>{items.find(item => item.id === value)?.name || 'Select'}</Text><MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#777777" />
    </Pressable>
    {open && !disabled && <View style={styles.dropdown}>{items.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: value === item.id }} onPress={() => { onChange(item.id); setOpen(false); }} style={[styles.option, value === item.id && styles.selected]}>
      <Text style={styles.fieldValue}>{item.name}</Text>{value === item.id && <MaterialCommunityIcons name="check" size={18} color="#8BAE41" />}
    </Pressable>)}</View>}
  </View>;
}
export function DownlinkSheet({ device, onClose, onSent, api = liveApi }: { device: Device; onClose: () => void; onSent?: () => void; api?: DownlinkApi }) {
  const { isTablet } = useResponsiveLayout();
  const [options, setOptions] = useState<DownlinkOptions>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [interfaceId, setInterfaceId] = useState('');
  const [value, setValue] = useState('');
  const [port, setPort] = useState('1');
  const [deviceClass, setDeviceClass] = useState<NonNullable<DownlinkDraft['deviceClass']>>('CLASS_C');
  const [networkKeyId, setNetworkKeyId] = useState('');
  const [changeKey, setChangeKey] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DownlinkResult>();
  const submitting = useRef(false);
  const portInput = useRef<TextInput>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLoadError('');
    api.options(device, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setOptions(data); setNetworkKeyId(data.defaultNetworkKeyId || '');
      setInterfaceId(data.interfaces.length === 1 ? data.interfaces[0].id : '');
    }).catch(error => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load controllers.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, device.id, device.organizationId, device.hardwareId, device.networkId, revision]);
  function editDraft(update: () => void) {
    if (submitting.current) return;
    setError(''); setResult(undefined);
    update();
  }
  async function send() {
    if (submitting.current || !options) return;
    setError(''); setResult(undefined);
    let command: DownlinkDraft;
    try {
      command = { interfaceId, value: controllerValue(value), port: Number(port), deviceClass, networkKeyId };
      downlinkAction(device, command, options);
    } catch (error) { setError(error instanceof Error ? error.message : 'Check the command fields.'); return; }
    submitting.current = true; setSending(true); setHasSubmitted(true);
    try { const response = await api.send(device, command, options); if (mounted.current) { setResult(response); onSent?.(); } }
    catch (error) { if (mounted.current) setError((error instanceof Error ? error.message : 'Unable to confirm the result.') + ' Check device logs before sending again.'); }
    finally { submitting.current = false; if (mounted.current) setSending(false); }
  }
  const close = () => { if (!submitting.current) { Keyboard.dismiss(); onClose(); } };
  const disabled = loading || !!loadError || sending || device.deleted || !interfaceId || !value.trim() || !networkKeyId || !port.trim();
  return <Modal visible transparent animationType="slide" onRequestClose={close}>
    {/* Android Modal already resizes for the keyboard. Avoid measuring the loading
        sheet as an initial height and subtracting the keyboard from it again. */}
    <KeyboardAvoidingView style={styles.keyboardFrame} enabled={Platform.OS === 'ios'} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <SafeAreaView style={[styles.overlay, isTablet && { justifyContent: 'center', padding: 24 }]} edges={['top', 'bottom', 'left', 'right']}>
      <Pressable accessibilityLabel="Close downlink panel" accessibilityRole="button" onPress={close} style={StyleSheet.absoluteFill} disabled={sending} />
      <View style={styles.sheet} accessibilityViewIsModal>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={false} style={styles.scroll}>
        <View style={styles.sheetIntro}><View style={styles.handle} />
          <View style={styles.header}><View style={{ width: 44 }} /><Text accessibilityRole="header" style={styles.title}>Send Downlink</Text><ActionIcon icon="close" label="Close downlink panel" onPress={close} disabled={sending} /></View>
          <Text style={styles.subtitle}>{device.name}</Text>
          <MaterialCommunityIcons name="cloud-download-outline" size={58} color="#8BAE41" style={{ marginLeft: 16, marginTop: 8 }} />
        </View>
        <View style={styles.content}>
          {device.deleted ? <Feedback title="Device archived" message="Commands are available for current devices." /> : loading ? <Feedback busy /> : loadError ? <Feedback title="Unable to load controllers" message={loadError} onRetry={() => setRevision(current => current + 1)} /> : !options?.interfaces.length ? <Feedback title="No downlink controllers" message="No supported controllers are available for this device." /> : <>
            <SelectField label="Downlink Controller" items={options.interfaces} value={interfaceId} onChange={id => editDraft(() => { setInterfaceId(id); setValue(''); })} disabled={sending} />
            <View style={styles.field}><Text style={styles.label}>Controller Value</Text><TextInput accessibilityLabel="Controller Value" autoCapitalize="none" autoCorrect={false} editable={!sending} value={value} onChangeText={next => editDraft(() => setValue(next))} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => portInput.current?.focus()} style={styles.input} /></View>
            <View style={styles.row}>
              <View style={styles.column}><View style={styles.field}><Text style={styles.label}>Downlink Port</Text><TextInput ref={portInput} accessibilityLabel="Downlink Port" keyboardType="number-pad" editable={!sending} value={port} onChangeText={next => editDraft(() => setPort(next))} returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} style={styles.input} /></View></View>
              <View style={styles.column}><SelectField label="Class" items={classes} value={deviceClass} onChange={id => editDraft(() => setDeviceClass(id as NonNullable<DownlinkDraft['deviceClass']>))} disabled={sending} /></View>
            </View>
            {changeKey ? <SelectField label="Downlink Key" items={options.networkKeys || []} value={networkKeyId} onChange={id => editDraft(() => { setNetworkKeyId(id); setChangeKey(false); })} disabled={sending} /> : <View style={styles.keyRow}>
              <Text style={styles.keyText}>Downlink Key: {options.networkKeys?.find(key => key.id === networkKeyId)?.name || 'Not available'}</Text>
              {!!options.networkKeys?.length && <Pressable accessibilityRole="button" accessibilityLabel="Change downlink key" disabled={sending} onPress={() => { Keyboard.dismiss(); setChangeKey(true); }} style={styles.changeKey}><Text style={styles.link}>change</Text></Pressable>}
            </View>}
            {!options.networkKeys?.length && <Text style={styles.error}>No downlink key is available for this device's network.</Text>}
          </>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!!result && <View accessibilityLiveRegion="polite" style={[styles.response, result.outcome !== 'accepted' && { backgroundColor: '#F3F4F6' }]}>
            <Text style={styles.responseTitle}>{result.outcome === 'accepted' ? 'Command accepted by network' : 'Delivery not confirmed'}</Text>
            <Text style={styles.responseText}>{result.message}</Text>
            <Text style={styles.responseText}>Device readings update when the backend reports the new state.</Text>
          </View>}
        </View>
        </ScrollView>
        <View style={styles.footer}><Pressable accessibilityRole="button" disabled={sending} onPress={close} style={styles.cancel}><Text style={styles.link}>{hasSubmitted ? 'Close' : 'Cancel'}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={'Send command to ' + device.name} disabled={!!disabled} accessibilityState={{ disabled: !!disabled, busy: sending }} onPress={send} style={[styles.send, disabled && { opacity: 0.45 }]}>{sending ? <ActivityIndicator color="white" /> : <Text style={styles.sendText}>Send</Text>}</Pressable></View>
      </View>
    </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  keyboardFrame: { flex: 1 }, scroll: { flexShrink: 1, minHeight: 0 },
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 600, maxHeight: '95%', flexShrink: 1, backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' },
  sheetIntro: { backgroundColor: '#F4F7EA', paddingBottom: 12 }, handle: { width: 38, height: 4, backgroundColor: '#D4D6CF', borderRadius: 3, alignSelf: 'center', marginTop: 8 }, header: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, alignItems: 'center' }, title: { flex: 1, textAlign: 'center', fontSize: 18, lineHeight: 25, color: '#2B2B2B', fontWeight: '600' }, subtitle: { textAlign: 'center', fontSize: 12, color: '#858585', paddingHorizontal: 20 },
  content: { padding: 20, paddingTop: 20, gap: 16 }, field: { borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 8, paddingHorizontal: 14, paddingTop: 8 },
  label: { color: '#739C25', fontSize: 12, lineHeight: 18 }, input: { paddingVertical: 10, minHeight: 44, fontSize: 16, color: '#303030' },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 10 }, fieldValue: { flex: 1, color: '#303030', fontSize: 15, lineHeight: 21 },
  dropdown: { borderTopWidth: 1, borderTopColor: '#EEEEEE' }, option: { minHeight: 44, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, selected: { backgroundColor: '#F3F7EA' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, column: { flex: 1, minWidth: 120 },
  keyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, keyText: { color: '#777777', fontSize: 12, flexShrink: 1 }, changeKey: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { color: '#739C25', fontSize: 14, fontWeight: '500' }, error: { color: '#B42318', lineHeight: 22, fontSize: 14 }, responseTitle: { color: '#303030', fontWeight: '600', fontSize: 14, lineHeight: 22 }, responseText: { color: '#62685D', fontSize: 13, lineHeight: 20 }, response: { gap: 4, padding: 12, backgroundColor: '#F3F7EA', borderRadius: 8 },
  footer: { flexDirection: 'row', flexShrink: 0, justifyContent: 'space-between', gap: 12, padding: 16 }, cancel: { flex: 1, minWidth: 94, minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#AFC879', borderRadius: 12 },
  send: { flex: 1, minWidth: 94, minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8BAE41', borderRadius: 12 }, sendText: { color: 'white', fontWeight: '600' },
});
