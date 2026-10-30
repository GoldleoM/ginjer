import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import type { Operations } from '../useOperations';
import type { AutomationRule, ProjectScope } from '../services/operations';
import { createAutomationApi, configuredScheduleCount, readableValue, type AutomationApi, type AutomationCatalog, type RunAttempt, type RunHistory } from '../services/automation';
import { authenticatedGraphql } from '../../../services/graphql';
import { formatTime } from '../services/normalizers';
import { ActionIcon, DetailRow, Feedback, InfoDialog, WorkspacePicker } from '../components/WorkspaceUI';
import { ResponsiveGrid, useResponsiveLayout } from '../../../layout/responsive';
import { theme } from '../../../theme';

const liveApi = createAutomationApi(authenticatedGraphql);
const human = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase());
const foreground = () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive' && (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
function useRunningRefresh(running: boolean, refresh: () => void) {
  const latest = useRef(refresh); latest.current = refresh;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => { if (foreground()) latest.current(); }, 22000);
    return () => clearInterval(timer);
  }, [running]);
}
function Badge({ state, label }: { state: string; label?: string }) {
  const normalized = state.toUpperCase();
  const color = /SUCCEEDED|SUCCESS|FEEDBACK_OK/.test(normalized) ? '#6F962E' : /ABORT|FAIL|ERROR/.test(normalized) ? '#D95B48' : /RUNNING|WAITING|PENDING|REQUESTED/.test(normalized) ? '#B47D12' : '#858585';
  return <View style={[styles.badge, { borderColor: color }]}><Text style={[styles.badgeText, { color }]}>{label || human(state) || 'Unknown'}</Text></View>;
}
function Filter({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label + ' filter: ' + value} onPress={onPress} style={styles.filter}>
    <Text style={styles.filterLabel}>{label}</Text><Text numberOfLines={1} style={styles.filterValue}>{value}</Text><MaterialCommunityIcons name="chevron-down" size={18} color="#858585" />
  </Pressable>;
}
function RuleCard({ rule, scope, api, onRuns, onMenu, onChanged }: { rule: AutomationRule; scope: ProjectScope; api: AutomationApi; onRuns: () => void; onMenu: () => void; onChanged: () => void }) {
  const [history, setHistory] = useState<RunHistory>();
  const [scheduleCount, setScheduleCount] = useState<number>();
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [enabled, setEnabled] = useState(rule.active);
  const lock = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => setEnabled(rule.active), [rule.active]);
  const running = !!history?.runs.some(run => run.state === 'RUNNING');
  const refresh = () => setRevision(value => value + 1);
  useRunningRefresh(running || accepted, refresh);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    Promise.allSettled([api.history(scope, rule.id, 1, controller.signal), api.schedules(scope, rule.id, controller.signal)]).then(([runs, schedules]) => {
      if (controller.signal.aborted) return;
      if (runs.status === 'fulfilled') { setHistory(runs.value); if (runs.value.runs.some(run => run.state === 'RUNNING')) setAccepted(false); }
      else setError('Run status unavailable. Refresh before sending a command.');
      setScheduleCount(configuredScheduleCount(rule, schedules.status === 'fulfilled' ? schedules.value.length : undefined));
      setLoading(false);
    });
    return () => controller.abort();
  }, [api, rule, scope, revision]);
  async function act(kind: 'run' | 'toggle', value?: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (kind === 'run') { await api.run(scope, rule); if (mounted.current) { setAccepted(true); setNotice('Run requested. Open runs to check execution.'); } }
      else { const state = await api.toggle(scope, rule, !!value); if (mounted.current) setEnabled(state); }
      if (mounted.current) { refresh(); onChanged(); }
    } catch (e) { if (mounted.current) setError((e instanceof Error ? e.message : 'Unable to confirm this request.') + ' No automatic retry was sent.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <View style={[styles.card, running && styles.runningCard]}>
    <View style={styles.cardTop}><Pressable accessibilityRole="button" accessibilityLabel={'View runs for ' + rule.name} onPress={onRuns} style={styles.ruleLink}><Text style={styles.ruleName}>{rule.name}</Text></Pressable>
      <View style={styles.switch}><Switch {...(Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : {})} accessibilityLabel={(enabled ? 'Disable ' : 'Enable ') + rule.name} value={enabled} disabled={busy} onValueChange={value => act('toggle', value)} trackColor={{ false: '#9295A7', true: theme.colors.primary }} thumbColor={enabled ? '#FFFFFF' : '#454052'} /></View>
      <ActionIcon icon="dots-vertical" label={'Options for ' + rule.name} onPress={onMenu} />
    </View>
    <View style={styles.cardBottom}>
      {rule.triggers.includes('MANUAL') ? <Pressable accessibilityRole="button" accessibilityLabel={'Run automation ' + rule.name} accessibilityState={{ disabled: busy || loading || !!error || running || accepted }} disabled={busy || loading || !!error || running || accepted} onPress={() => act('run')} style={[styles.runButton, (busy || loading || !!error || running || accepted) && styles.disabled]}>
        <MaterialCommunityIcons name="play-outline" size={17} color="white" /><Text style={styles.runText}>Run Automation</Text>
      </Pressable> : <View accessibilityLabel={scheduleCount === undefined ? 'Schedules unavailable' : scheduleCount + ' schedules'} style={styles.counter}><MaterialCommunityIcons name="calendar-blank-outline" size={15} color="#858585" /><Text style={styles.counterText}>{scheduleCount ?? '-'}</Text></View>}
      {running ? <Badge state="RUNNING" /> : accepted ? <Badge state="REQUESTED" /> : null}
      {!enabled && rule.autoDisabled && <Badge state="ERROR" label="Auto-disabled" />}
      <View accessibilityLabel={rule.actions.length + ' command steps'} style={styles.counter}><MaterialCommunityIcons name="timer-outline" size={15} color="#858585" /><Text style={styles.counterText}>{rule.actions.length}</Text></View>
      {busy && <ActivityIndicator size="small" color={theme.colors.primary} />}
    </View>
    {!!notice && <View><Text accessibilityLiveRegion="polite" style={styles.caption}>{notice}</Text>{accepted && <Pressable accessibilityRole="button" onPress={() => { setAccepted(false); setNotice(''); refresh(); }} style={styles.textButton}><Text style={styles.link}>Refresh status</Text></Pressable>}</View>}
    {!!error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { setAccepted(false); refresh(); }} style={styles.textButton}><Text style={styles.link}>Refresh status</Text></Pressable></View>}
  </View>;
}

export function ConnectedAutomation({ operations, devices, onDevice, api = liveApi }: { operations: Operations; devices: Device[]; onDevice: (device: Device) => void; api?: AutomationApi }) {
  const [query, setQuery] = useState(''); const [searchOpen, setSearchOpen] = useState(false);
  const [solution, setSolution] = useState(''); const [output, setOutput] = useState('');
  const [picker, setPicker] = useState<'solution' | 'output' | null>(null);
  const [runId, setRunId] = useState(''); const [menuId, setMenuId] = useState(''); const [details, setDetails] = useState(false);
  const [catalog, setCatalog] = useState<AutomationCatalog>({ solutions: [], labels: {} }); const [catalogError, setCatalogError] = useState('');
  const [limit, setLimit] = useState(30); const [catalogRevision, setCatalogRevision] = useState(0);
  const { rules, scope } = operations;
  useEffect(() => { if (!runId) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { setRunId(''); return true; }); return () => sub.remove(); }, [runId]);
  useEffect(() => {
    const controller = new AbortController(); setCatalogError('');
    api.catalog(scope, controller.signal).then(value => { if (!controller.signal.aborted) setCatalog(value); }).catch(() => { if (!controller.signal.aborted) setCatalogError('Filter names could not be loaded.'); });
    return () => controller.abort();
  }, [api, scope, catalogRevision]);
  const automations = rules.data.filter(rule => rule.actions.length > 0 || rule.triggers.includes('MANUAL'));
  const label = (id: string) => catalog.labels[id] || devices.flatMap(d => d.readings).find(r => r.id === id)?.title || id;
  const solutions = [...new Set(automations.map(rule => rule.solutionId).filter(Boolean))].map(id => ({ id, name: catalog.solutions.find(item => item.id === id)?.name || id }));
  const outputs = [...new Set(automations.flatMap(rule => rule.conditions.map(condition => condition.outputId)).filter(Boolean))].map(id => ({ id, name: label(id) }));
  const filtered = automations.filter(rule => (!solution || rule.solutionId === solution) && (!output || rule.conditions.some(condition => condition.outputId === output)) && rule.name.toLowerCase().includes(query.trim().toLowerCase()));
  const menu = automations.find(rule => rule.id === menuId); const selected = automations.find(rule => rule.id === runId);
  if (selected) return <AutomationRuns key={selected.id} rule={selected} scope={scope} api={api} devices={devices} labels={catalog.labels} onBack={() => setRunId('')} onDevice={onDevice} />;
  return <View style={{ flex: 1 }}><FlatList data={filtered.slice(0, limit)} keyExtractor={rule => rule.id} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={rules.busy} onRefresh={operations.refresh} tintColor={theme.colors.primary} />}
    ListHeaderComponent={<View style={styles.stack}>
      <View style={styles.filters}><Filter label="Solution" value={solutions.find(s => s.id === solution)?.name || 'All'} onPress={() => setPicker('solution')} /><Filter label="Output" value={outputs.find(o => o.id === output)?.name || 'All'} onPress={() => setPicker('output')} /></View>
      <View style={styles.sectionBar}><Text accessibilityRole="header" style={styles.title}>Automation</Text><ActionIcon icon="magnify" label="Search automations" onPress={() => setSearchOpen(value => !value)} /><ActionIcon icon="refresh" label="Refresh automations" onPress={() => { operations.refresh(); setCatalogRevision(v => v + 1); }} /></View>
      {searchOpen && <TextInput accessibilityLabel="Search automation rules" placeholder="Search automations" value={query} onChangeText={value => { setQuery(value); setLimit(30); }} style={styles.search} autoCorrect={false} />}
      {!!catalogError && <Text style={styles.error}>{catalogError}</Text>}
      {!!rules.error && <Feedback title="Unable to refresh automations" message={rules.error} onRetry={operations.refresh} />}
    </View>}
    renderItem={({ item }) => <RuleCard rule={item} scope={scope} api={api} onRuns={() => setRunId(item.id)} onMenu={() => { setMenuId(item.id); setDetails(false); }} onChanged={operations.refresh} />}
    ListEmptyComponent={rules.busy && !rules.data.length ? <Feedback busy /> : !rules.error ? <Feedback title="No automations found" message={solution || output || query ? 'Try another filter or search.' : 'This project has no configured automation commands.'} /> : null}
    ListFooterComponent={limit < filtered.length ? <Pressable accessibilityRole="button" onPress={() => setLimit(n => n + 30)} style={styles.textButton}><Text style={styles.link}>Load more automations</Text></Pressable> : null} />
    {picker && <WorkspacePicker title={picker === 'solution' ? 'Solution' : 'Output'} selectedId={picker === 'solution' ? solution : output} items={[{ id: '', name: 'All' }, ...(picker === 'solution' ? solutions : outputs)]} onClose={() => setPicker(null)} onSelect={id => { picker === 'solution' ? setSolution(id) : setOutput(id); setLimit(30); setPicker(null); }} />}
    <InfoDialog visible={!!menu} title={menu?.name || 'Automation'} onClose={() => setMenuId('')}>
      {!!menu && <View style={styles.stack}><Pressable accessibilityRole="button" onPress={() => { setRunId(menu.id); setMenuId(''); }} style={styles.menuRow}><MaterialCommunityIcons name="history" size={21} color={theme.colors.primary} /><Text style={styles.link}>Automation runs</Text><MaterialCommunityIcons name="chevron-right" size={20} color="#858585" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(value => !value)} style={styles.menuRow}><MaterialCommunityIcons name="information-outline" size={21} color={theme.colors.primary} /><Text style={styles.link}>Rule details</Text><MaterialCommunityIcons name={details ? 'chevron-up' : 'chevron-down'} size={20} color="#858585" /></Pressable>
        {details && <><DetailRow label="Status" value={menu.active ? 'Enabled' : 'Disabled'} /><DetailRow label="Triggers" value={menu.triggers.map(human).join(', ')} />
          <DetailRow label="Solution" value={catalog.solutions.find(item => item.id === menu.solutionId)?.name} /><DetailRow label="Schedule" value={menu.schedule} />
          {!!menu.autoDisabled && <View style={styles.disabledNotice}><Text style={styles.stepTitle}>{menu.active ? 'Last automatic disable' : 'Disabled automatically'}</Text><DetailRow label="Reason" value={human(menu.autoDisabled.reason)} /><DetailRow label="At" value={menu.autoDisabled.at ? formatTime(menu.autoDisabled.at) : undefined} /><DetailRow label="Step" value={menu.autoDisabled.stepIndex == null ? undefined : menu.autoDisabled.stepIndex + 1} /></View>}
          {!!menu.scheduleConfiguration && <ScheduleDetails schedule={menu.scheduleConfiguration} />}
          {menu.conditions.map((condition, i) => <View key={i}>{i > 0 && !!condition.relation && <Text style={styles.caption}>{human(condition.relation)}</Text>}<DetailRow label={label(condition.outputId)} value={human(condition.operator) + ' ' + condition.value} /></View>)}
          {menu.actions.map((action, i) => {
            const device = devices.find(d => d.id === action.deviceId && d.organizationId === scope.organisationId && d.projectId === scope.projectId);
            const feedbackDevice = devices.find(d => d.id === action.feedback?.deviceId && d.organizationId === scope.organisationId && d.projectId === scope.projectId);
            return <View key={i} style={styles.configStep}><View style={styles.stepHeading}><Text style={styles.stepTitle}>Step {i + 1}{device ? ' - ' + device.name : ''}</Text>{action.active === false && <Badge state="DISABLED" />}</View>
              <DetailRow label={label(action.interfaceId)} value={readableValue(action.value)} />
              <RuleFields fields={[
                ['Delay (minutes)', action.delay], ['Downlink port', action.port], ['Device class', action.deviceClass.replace(/^CLASS_/, 'Class ')], ['Trigger', human(action.trigger)],
              ]} />
              {action.feedback && <View style={styles.feedbackConfig}><Text style={styles.stepTitle}>Expected feedback</Text><DetailRow label="Device" value={feedbackDevice?.name || action.feedback.deviceId} /><DetailRow label={label(action.feedback.outputId)} value={human(action.feedback.operator) + ' ' + action.feedback.value} /><DetailRow label="Check after (minutes)" value={action.feedback.timeout} /></View>}
            </View>;
          })}
          {menu.deviceIds.map(id => { const device = devices.find(d => d.id === id && d.organizationId === scope.organisationId && d.projectId === scope.projectId); return device ? <Pressable key={id} accessibilityRole="button" onPress={() => { setMenuId(''); onDevice(device); }} style={styles.textButton}><Text style={styles.link}>{device.name}</Text></Pressable> : null; })}
        </>}
      </View>}
    </InfoDialog>
  </View>;
}

function RuleFields({ fields }: { fields: [string, unknown][] }) {
  return <ResponsiveGrid minimumWidth={125} maximumColumns={2} gap={8}>
    {fields.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
  </ResponsiveGrid>;
}
function ScheduleDetails({ schedule }: { schedule: NonNullable<AutomationRule['scheduleConfiguration']> }) {
  return <View style={styles.configStep}><Text style={styles.stepTitle}>Configured schedule</Text>
    <RuleFields fields={[
      ['Type', human(schedule.type)], ['Interval (minutes)', schedule.interval], ['Start time', schedule.time], ['Second time', schedule.secondTime], ['End time', schedule.endTime],
      ['Start date', schedule.date ? formatTime(schedule.date) : undefined], ['Timezone', schedule.timezone], ['Repeat', human(schedule.repeatType)], ['Days', schedule.repeatOn.map(human).join(', ')],
      ['Ends', schedule.end ? human(schedule.end.type) : undefined], ['End date', schedule.end?.date ? formatTime(schedule.end.date) : undefined], ['Occurrences', schedule.end?.occurrences],
    ]} />
  </View>;
}

function AutomationRuns({ rule, scope, api, devices, labels, onBack, onDevice }: { rule: AutomationRule; scope: ProjectScope; api: AutomationApi; devices: Device[]; labels: Record<string, string>; onBack: () => void; onDevice: (device: Device) => void }) {
  const [history, setHistory] = useState<RunHistory>(); const [page, setPage] = useState(1); const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true); const [error, setError] = useState(''); const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [attempts, setAttempts] = useState<RunAttempt[]>([]); const [attemptPage, setAttemptPage] = useState(1); const [attemptPages, setAttemptPages] = useState(1); const [attemptError, setAttemptError] = useState(''); const [attemptBusy, setAttemptBusy] = useState(false);
  const refresh = () => { setAttemptPage(1); setRevision(value => value + 1); };
  useRunningRefresh(!!history?.runs.some(run => run.state === 'RUNNING'), refresh);
  useEffect(() => {
    const c = new AbortController(); setBusy(true); setError('');
    api.history(scope, rule.id, page, c.signal).then(value => { if (!c.signal.aborted) setHistory(value); }).catch(e => { if (!c.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load runs.'); }).finally(() => { if (!c.signal.aborted) setBusy(false); });
    return () => c.abort();
  }, [api, scope, rule.id, page, revision]);
  useEffect(() => {
    const c = new AbortController(); setAttemptBusy(true); setAttemptError('');
    api.attempts(scope, rule.id, attemptPage, c.signal).then(value => { if (!c.signal.aborted) { setAttemptPages(value.pages); setAttempts(previous => attemptPage === 1 ? value.attempts : [...new Map([...previous, ...value.attempts].map(a => [a.id, a])).values()]); } })
      .catch(e => { if (!c.signal.aborted) setAttemptError(e instanceof Error ? e.message : 'Unable to load delivery attempts.'); }).finally(() => { if (!c.signal.aborted) setAttemptBusy(false); });
    return () => c.abort();
  }, [api, scope, rule.id, attemptPage, revision]);
  function changePage(next: number) { setHistory(undefined); setExpanded({}); setPage(next); }
  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={theme.colors.primary} />}>
    <View style={styles.runHeading}><ActionIcon icon="arrow-left" label="Back to automations" onPress={onBack} /><View style={styles.avatar}><Text style={styles.avatarText}>{rule.name.charAt(0).toUpperCase()}</Text></View><Text accessibilityRole="header" style={styles.runName}>{rule.name}</Text></View>
    <View style={styles.historyPanel}><View style={styles.historyHeading}><Text accessibilityRole="header" style={styles.title}>Automation Runs</Text><Pressable accessibilityRole="button" disabled={busy} onPress={refresh} style={styles.refresh}>{busy ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.runText}>Refresh</Text>}</Pressable></View>
      {!!error && <Feedback title="Run history unavailable" message={error} onRetry={refresh} />}
      {busy && !history ? <Feedback busy /> : !history?.runs.length && !error ? <Text style={styles.caption}>No runs were returned for this automation.</Text> : null}
      {history?.runs.map(run => <View key={run.id} style={styles.run}>
        <Pressable accessibilityRole="button" accessibilityLabel={'Run ' + formatTime(run.startedAt)} accessibilityState={{ expanded: !!expanded[run.id] }} aria-expanded={!!expanded[run.id]} onPress={() => setExpanded(value => ({ ...value, [run.id]: !value[run.id] }))} style={styles.runSummary}>
          <MaterialCommunityIcons name={expanded[run.id] ? 'chevron-up' : 'chevron-down'} size={18} color="#9295A7" /><Text style={styles.runDate}>{formatTime(run.startedAt)}</Text><Text style={styles.caption}>{run.trigger === 'SCHEDULE_TICK' ? 'Schedule' : human(run.trigger)}</Text><Badge state={run.state} />{!!run.reason && <Text style={styles.caption}>{human(run.reason)}</Text>}
        </Pressable>
        {expanded[run.id] && <View style={styles.steps}>
          {run.steps.length ? run.steps.map((step, index) => {
            const device = devices.find(d => d.id === step.deviceId && d.organizationId === scope.organisationId && d.projectId === scope.projectId);
            const feedbackDevice = devices.find(d => d.id === step.feedback?.deviceId && d.organizationId === scope.organisationId && d.projectId === scope.projectId);
            const feedbackOutput = labels[step.feedback?.outputId || ''] || feedbackDevice?.readings.find(r => r.id === step.feedback?.outputId)?.title || 'Output';
            const rows = attempts.filter(a => a.runId === run.id && (a.stepIndex === index || step.downlinkIds.includes(a.id)));
            return <View key={index} style={styles.step}><View style={styles.stepHeading}><Text style={styles.stepTitle}>Step {index + 1}</Text><Text style={styles.stepCommand}>{device?.name || step.deviceId} - {labels[step.interfaceId] || 'Command'} = {readableValue(step.value)}</Text><Badge state={step.phase} /></View>
              {!!step.feedback && <Text style={styles.caption}>Feedback: {feedbackDevice?.name || step.feedback.deviceId}, {feedbackOutput} {human(step.feedback.operator)} {step.feedback.value}; checked after {step.feedback.timeout} min.</Text>}
              {!!step.dueAt && <Text style={styles.caption}>Next check: {formatTime(step.dueAt)}</Text>}{!!step.succeededAt && <Text style={styles.caption}>Succeeded: {formatTime(step.succeededAt)}</Text>}{!!step.note && <Text style={styles.caption}>{step.note}</Text>}
              <AttemptRows attempts={rows} />
              {!rows.length && <Text style={styles.caption}>{attemptBusy ? 'Loading attempts...' : step.attempt ? `Attempt ${step.attempt}${step.sentAt ? ' sent at ' + formatTime(step.sentAt) : ''}. Delivery details are not in the loaded history.` : 'No attempt reported yet.'}</Text>}
              {device && <Pressable accessibilityRole="button" onPress={() => onDevice(device)} style={styles.textButton}><Text style={styles.link}>View device</Text></Pressable>}
            </View>;
          }) : <Text style={styles.caption}>No step details were returned for this run.</Text>}
          {!!run.finishedAt && <Text style={styles.caption}>Finished: {formatTime(run.finishedAt)}</Text>}{!!run.skipped && <Text style={styles.caption}>Skipped triggers: {run.skipped}</Text>}
        </View>}
      </View>)}
      {!!attemptError && <Text accessibilityRole="alert" style={styles.error}>{attemptError}</Text>}
      {attemptPage < attemptPages && <Pressable accessibilityRole="button" disabled={attemptBusy} onPress={() => setAttemptPage(p => p + 1)} style={styles.textButton}><Text style={styles.link}>{attemptBusy ? 'Loading attempts...' : 'Load older delivery attempts'}</Text></Pressable>}
      <View style={styles.pagination}><Pressable accessibilityRole="button" disabled={busy || page <= 1} onPress={() => changePage(page - 1)} style={[styles.textButton, (busy || page <= 1) && styles.disabled]}><Text style={styles.link}>Previous</Text></Pressable><Text style={styles.caption}>Page {history?.page || page} of {history?.pages || 1}</Text><Pressable accessibilityRole="button" disabled={busy || page >= (history?.pages || 1)} onPress={() => changePage(page + 1)} style={[styles.textButton, (busy || page >= (history?.pages || 1)) && styles.disabled]}><Text style={styles.link}>Next</Text></Pressable></View>
    </View>
  </ScrollView>;
}
function AttemptRows({ attempts }: { attempts: RunAttempt[] }) {
  const { isTablet } = useResponsiveLayout();
  if (!attempts.length) return null;
  const headers = ['Attempt', 'Sent at', 'Transport', 'Result', 'Detail'];
  const cells = (a: RunAttempt) => [String(a.attempt || '-'), formatTime(a.sentAt), human(a.transport) || 'Not reported', human(a.status) || 'Not reported', [a.failure ? human(a.failure) : '', a.feedback ? 'Feedback: ' + a.feedback : '', a.checkedAt ? 'Checked: ' + formatTime(a.checkedAt) : ''].filter(Boolean).join('\n') || '-'];
  return <View style={styles.attemptTable}>{isTablet && <View style={styles.tableRow}>{headers.map(h => <Text key={h} style={[styles.cell, styles.columnLabel]}>{h}</Text>)}</View>}
    {attempts.map(a => isTablet ? <View key={a.id} style={styles.tableRow}>{cells(a).map((value, i) => i === 3 ? <View key={i} style={styles.cell}><Badge state={a.status} /></View> : <Text key={i} style={styles.cell}>{value}</Text>)}</View> : <View key={a.id} style={styles.attempt}><ResponsiveGrid minimumWidth={125} maximumColumns={2} gap={10}>{cells(a).map((value, i) => <View key={i}><Text style={styles.columnLabel}>{headers[i]}</Text>{i === 3 ? <Badge state={a.status} /> : <Text style={styles.cell}>{value}</Text>}</View>)}</ResponsiveGrid></View>)}
  </View>;
}
const styles = StyleSheet.create({
  configStep: { borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 12, gap: 6 }, feedbackConfig: { padding: 10, borderRadius: 8, backgroundColor: '#F4F7ED' }, disabledNotice: { padding: 10, borderRadius: 8, backgroundColor: '#FFF3EF' },
  content: { padding: 12, paddingBottom: 24, gap: 8 }, stack: { gap: 10 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8, marginBottom: 4 },
  filter: { flex: 1, minWidth: 120, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#D1D1D1', borderRadius: 10, backgroundColor: 'white', paddingHorizontal: 12 },
  filterLabel: { position: 'absolute', top: -8, left: 10, paddingHorizontal: 4, fontSize: 10, color: '#76972E', backgroundColor: '#FAFAFA' }, filterValue: { flex: 1, color: '#303030', fontSize: 13 },
  sectionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F2F4', paddingLeft: 12 }, title: { flex: 1, minWidth: 0, color: '#252525', fontSize: 16, fontWeight: '600' },
  search: { minHeight: 46, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#EEEEEE', backgroundColor: 'white', fontSize: 13 },
  card: { borderRadius: 10, borderWidth: 1, borderColor: '#ECECEC', backgroundColor: 'white', paddingHorizontal: 12, paddingBottom: 12 }, runningCard: { backgroundColor: '#EDF3E2' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 4 }, ruleLink: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' }, ruleName: { fontSize: 14, lineHeight: 21, color: '#7C9F32', fontWeight: '600' }, switch: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, runButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 22, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 4 }, runText: { color: 'white', fontSize: 12, fontWeight: '600' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, minHeight: 28, borderRadius: 16, backgroundColor: '#F5F6F5', borderWidth: 1, borderColor: '#ECEEEC' }, counterText: { fontSize: 12, color: '#555555' },
  badge: { maxWidth: '100%', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#FFFFFFBB' }, badgeText: { fontSize: 11, lineHeight: 16 }, caption: { color: '#858585', fontSize: 12, lineHeight: 19 }, error: { color: '#B42318', fontSize: 12, lineHeight: 19 }, disabled: { opacity: 0.45 },
  link: { color: '#76972E', fontSize: 13, fontWeight: '500' }, textButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 }, menuRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 12 },
  runHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFEFEF', justifyContent: 'center', alignItems: 'center' }, avatarText: { color: '#777777', fontSize: 24 }, runName: { flex: 1, minWidth: 0, color: '#252535', fontSize: 20, fontWeight: '600' },
  historyPanel: { backgroundColor: 'white', borderRadius: 12, padding: 12, gap: 10 }, historyHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }, refresh: { minHeight: 44, minWidth: 76, borderRadius: 8, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  run: { borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 8, overflow: 'hidden' }, runSummary: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 10 }, runDate: { fontSize: 12, lineHeight: 19, fontWeight: '600', color: '#303030' },
  steps: { paddingHorizontal: 12, paddingBottom: 12, gap: 12 }, step: { borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 12, gap: 5 }, stepHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, stepTitle: { fontSize: 12, lineHeight: 19, fontWeight: '600', color: '#303030' }, stepCommand: { fontSize: 12, lineHeight: 19, color: '#303030', flexShrink: 1 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, attemptTable: { marginTop: 8 }, tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingVertical: 8, gap: 12 }, cell: { flex: 1, minWidth: 0, fontSize: 12, color: '#303030', lineHeight: 19 }, columnLabel: { fontSize: 11, color: '#858585', fontWeight: '500', lineHeight: 18 }, attempt: { borderRadius: 8, padding: 10, backgroundColor: '#F8F9F6', marginBottom: 8 },
});
