import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import { authenticatedGraphql } from '../../../services/graphql';
import { useResponsiveLayout } from '../../../layout/responsive';
import { createDownlinkApi, downlinkAction, parseCommandValue, type DownlinkApi, type DownlinkDraft, type DownlinkOptions, type DownlinkResult } from '../services/downlinks';
import { ActionIcon, Feedback } from './WorkspaceUI';

const liveApi = createDownlinkApi(authenticatedGraphql);
export function DownlinkSheet({ device, onClose, onSent, api = liveApi }: { device: Device; onClose: () => void; onSent?: () => void; api?: DownlinkApi }) {
  const { isTablet } = useResponsiveLayout();
  const [options, setOptions] = useState<DownlinkOptions>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [custom, setCustom] = useState(false);
  const [commandId, setCommandId] = useState('');
  const [interfaceId, setInterfaceId] = useState('');
  const [value, setValue] = useState('');
  const [port, setPort] = useState('');
  const [sending, setSending] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DownlinkResult>();
  const submitting = useRef(false);
  const mounted = useRef(true);
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLoadError('');
    api.options(device, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setOptions(data); if (data.commands.length === 1) setCommandId(data.commands[0].id);
      if (data.interfaces.length === 1) setInterfaceId(data.interfaces[0].id);
    }).catch(error => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load commands.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, device.id, device.organizationId, device.hardwareId, revision]);
  useEffect(() => {
    if (!sending) { pulse.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true })]));
    animation.start(); return () => animation.stop();
  }, [sending, pulse]);
  const selected = options?.commands.find(item => item.id === commandId);
  function draft(): DownlinkDraft {
    if (!custom) {
      if (!selected) throw new Error('Choose a saved command.');
      return { interfaceId: selected.interfaceId, value: selected.value, port: selected.port, deviceClass: selected.deviceClass, networkKeyId: selected.networkKeyId };
    }
    return { interfaceId, value: parseCommandValue(value), ...(port.trim() ? { port: Number(port) } : {}) };
  }
  async function send() {
    if (submitting.current || attempted || !options) return;
    setError('');
    let command: DownlinkDraft;
    try { command = draft(); downlinkAction(device, command, options); }
    catch (error) { setError(error instanceof Error ? error.message : 'Check the command fields.'); return; }
    submitting.current = true; setSending(true); setAttempted(true);
    try { const response = await api.send(device, command, options); if (mounted.current) { setResult(response); onSent?.(); } }
    catch (error) { if (mounted.current) setError((error instanceof Error ? error.message : 'Unable to confirm the result.') + ' Check device logs before sending again.'); }
    finally { submitting.current = false; if (mounted.current) setSending(false); }
  }
  const close = () => { if (!submitting.current) onClose(); };
  const disabled = loading || !!loadError || sending || attempted || device.deleted || !options?.interfaces.length || (custom ? !interfaceId || !value.trim() : !selected);
  return <Modal visible transparent animationType="slide" onRequestClose={close}>
    <SafeAreaView style={[styles.overlay, isTablet && { justifyContent: 'center', padding: 24 }]} edges={['top', 'bottom', 'left', 'right']}>
      <Pressable accessibilityLabel="Close downlink panel" accessibilityRole="button" onPress={close} style={StyleSheet.absoluteFill} disabled={sending} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.handle} />
        <View style={styles.header}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>Send Downlink</Text><Text style={styles.caption}>{device.name}</Text></View><ActionIcon icon="close" label="Close downlink panel" onPress={close} disabled={sending} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={styles.content}>
          <Animated.View style={[styles.cloud, { transform: [{ scale: pulse }] }]}><MaterialCommunityIcons name="cloud-download-outline" size={48} color="#83AF23" /></Animated.View>
          <Text style={styles.caption}>Send a command to this device. Its reported state updates after the device responds.</Text>
          {device.deleted ? <Feedback title="Device archived" message="Commands are available for current devices." /> : loading ? <Feedback busy /> : loadError ? <Feedback title="Unable to load commands" message={loadError} onRetry={() => setRevision(value => value + 1)} /> : !options?.interfaces.length ? <Feedback title="No downlink interfaces" message="This hardware has no supported command interfaces available to your account." /> : <>
            {options.warnings.map(warning => <Text key={warning} style={styles.notice}>{warning}</Text>)}
            <View style={styles.choices}>{[false, true].map(mode => <Pressable key={String(mode)} accessibilityRole="button" accessibilityState={{ selected: custom === mode }} disabled={attempted} onPress={() => { setCustom(mode); setError(''); }} style={[styles.choice, custom === mode && styles.selected]}><Text style={styles.link}>{mode ? 'Custom command' : 'Saved commands'}</Text></Pressable>)}</View>
            {!custom ? <>
              {!options.commands.length && <Text style={styles.notice}>No commands have been saved for this device. Custom commands require the interface's exact payload format.</Text>}
              {options.commands.map(command => <Pressable key={command.id} accessibilityRole="radio" accessibilityState={{ checked: command.id === commandId }} disabled={attempted} onPress={() => setCommandId(command.id)} style={[styles.command, command.id === commandId && styles.selected]}><Text style={styles.commandName}>{command.name}</Text><Text style={styles.caption}>{options.interfaces.find(item => item.id === command.interfaceId)?.name} / Port {command.port}</Text></Pressable>)}
              {selected && <><Text style={styles.label}>Command value</Text><Text selectable style={styles.raw}>{JSON.stringify(selected.value, null, 2)}</Text></>}
            </> : <>
              <Text style={styles.label}>Interface</Text>
              {options.interfaces.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: interfaceId === item.id }} disabled={attempted} onPress={() => setInterfaceId(item.id)} style={[styles.command, interfaceId === item.id && styles.selected]}><Text style={styles.commandName}>{item.name}</Text></Pressable>)}
              <Text style={styles.label}>Command value (JSON object)</Text>
              <TextInput accessibilityLabel="Downlink command JSON" multiline autoCapitalize="none" autoCorrect={false} editable={!attempted} value={value} onChangeText={setValue} placeholder="Enter the payload required by this interface" style={[styles.input, styles.editor]} />
              <Text style={styles.label}>Port (optional)</Text><TextInput accessibilityLabel="Downlink port" keyboardType="number-pad" editable={!attempted} value={port} onChangeText={setPort} placeholder="Use interface default" style={styles.input} />
            </>}
          </>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!!result && <View accessibilityLiveRegion="polite" style={styles.response}><Text style={styles.commandName}>Server response</Text><Text selectable style={styles.message}>{result.message}</Text><Text style={styles.caption}>{result.type}</Text></View>}
        </ScrollView>
        <View style={styles.footer}><Pressable accessibilityRole="button" disabled={sending} onPress={close} style={styles.cancel}><Text style={styles.link}>{attempted ? 'Close' : 'Cancel'}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={'Send command to ' + device.name} disabled={!!disabled} accessibilityState={{ disabled: !!disabled, busy: sending }} onPress={send} style={[styles.send, disabled && { opacity: 0.45 }]}>{sending ? <ActivityIndicator color="white" /> : <Text style={styles.sendText}>{attempted ? 'Request complete' : 'Send'}</Text>}</Pressable></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '95%', backgroundColor: 'white', borderRadius: 24, overflow: 'hidden' },
  handle: { width: 36, height: 4, backgroundColor: '#D6D6D6', borderRadius: 4, marginTop: 9, alignSelf: 'center' },
  header: { flexDirection: 'row', padding: 20, paddingBottom: 10, alignItems: 'center', gap: 8 }, title: { fontSize: 22, color: '#303030', fontWeight: '600' },
  content: { padding: 20, paddingTop: 0, gap: 12 }, caption: { color: '#777777', fontSize: 12, lineHeight: 19, marginTop: 4 }, cloud: { alignSelf: 'center', padding: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, choice: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#DDDDDD' },
  selected: { borderColor: '#83AF23', backgroundColor: '#F3F7EA' }, link: { color: '#6D941B', fontSize: 14, fontWeight: '500' },
  command: { borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 9, padding: 14, minHeight: 48, justifyContent: 'center' }, commandName: { fontSize: 14, lineHeight: 22, color: '#303030', fontWeight: '600' },
  label: { color: '#777777', fontSize: 12, marginTop: 4 }, input: { borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 48, color: '#303030' },
  editor: { minHeight: 130, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  raw: { backgroundColor: '#F6F6F6', padding: 12, borderRadius: 8, fontSize: 12, lineHeight: 20, color: '#555555' }, notice: { color: '#777777', fontSize: 13, lineHeight: 21 }, error: { color: '#B42318', lineHeight: 22, fontSize: 14 },
  response: { padding: 14, borderRadius: 8, backgroundColor: '#F3F7EA', gap: 6 }, message: { color: '#303030', fontSize: 14, lineHeight: 22 },
  footer: { flexDirection: 'row', gap: 12, padding: 18, borderTopWidth: 1, borderTopColor: '#EEEEEE' }, cancel: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#83AF23', borderRadius: 10 },
  send: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#83AF23', borderRadius: 10, padding: 10 }, sendText: { color: 'white', fontWeight: '600', textAlign: 'center' },
});
