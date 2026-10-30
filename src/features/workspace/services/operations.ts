import type { ApiRequest } from '../../../services/graphqlTransport';
import type { Device } from '../../devices/types';

export interface ProjectScope { organisationId: string; projectId: string; }
export interface AutomationSchedule {
  type: string; interval?: number; time: string; secondTime: string; endTime: string; date?: string;
  timezone: string; repeatOn: string[]; repeatType: string;
  end?: { type: string; date?: string; occurrences?: number };
}
export interface AutomationAction {
  deviceId: string; interfaceId: string; active?: boolean; value?: unknown; delay?: number;
  port?: number; deviceClass: string; trigger: string;
  feedback?: { deviceId: string; outputId: string; operator: string; value: string; timeout?: number };
}
export interface AutomationRule {
  id: string; name: string; active: boolean; triggers: string[]; schedule: string;
  organizationId: string; projectId: string; solutionId: string; outputNames: string[];
  scheduleConfiguration?: AutomationSchedule;
  autoDisabled?: { at?: string; runId: string; stepIndex?: number; reason: string; deviceId: string };
  conditions: { outputId: string; operator: string; value: string; deviceIds: string[]; relation: string }[];
  actions: AutomationAction[];
  deviceIds: string[];
}
export interface Notification {
  id: string; ruleId: string; deviceId: string; status: 'ACTIVE' | 'ACKNOWLEDGED' | 'ARCHIVED';
  timestamp?: string; count: number; values: { outputId: string; value: string; label: string }[];
}
export interface AutomationRun {
  id: string; state: string; trigger: string; deviceId: string; startedAt?: string; finishedAt?: string;
  currentStep: number; skipped: number; abortReason: string; cancelReason: string;
}
export interface RunPage { runs: AutomationRun[]; page: number; pages: number; total: number; }
export interface OperationsApi {
  rules(scope: ProjectScope, signal?: AbortSignal): Promise<AutomationRule[]>;
  notifications(scope: ProjectScope, signal?: AbortSignal): Promise<Notification[]>;
  runs(scope: ProjectScope, ruleId: string, page: number, signal?: AbortSignal): Promise<RunPage>;
}
const obj = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const arr = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const str = (value: unknown) => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const optionalNumber = (value: unknown) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined;
function date(value: unknown): string | undefined {
  if (value == null || value === '') return;
  const numeric = typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value)) ? Number(value) : NaN;
  const time = new Date(Number.isFinite(numeric) ? (numeric < 1e11 ? numeric * 1000 : numeric) : String(value));
  return Number.isFinite(time.getTime()) ? time.toISOString() : undefined;
}
function matches(row: Record<string, unknown>, scope: ProjectScope) { return row.organisationId === scope.organisationId && row.projectId === scope.projectId; }
function checkScope(scope: ProjectScope) { if (!scope.organisationId?.trim() || !scope.projectId?.trim()) throw new Error('Choose an organization and project first.'); }
export function normalizeRules(value: unknown, scope: ProjectScope): AutomationRule[] {
  return arr(value).map(obj).filter(row => matches(row, scope) && row._id && row.deleted !== true).map(row => {
    const actions = arr(row.advanceConditions).map(obj).filter(action => !!action.deviceId && !!action.downlinkInterfaceId)
      .map(action => ({ deviceId: str(action.deviceId), interfaceId: str(action.downlinkInterfaceId), value: action.value, delay: optionalNumber(action.scheduleInMin), active: action.active === false || action.clusterActive === false ? false : action.active === true ? true : undefined,
        port: optionalNumber(action.port), deviceClass: str(action.deviceClass), trigger: str(action.triggerType),
        feedback: action.feedback ? { deviceId: str(obj(action.feedback).deviceId), outputId: str(obj(action.feedback).outputId), operator: str(obj(action.feedback).conditionType), value: str(obj(action.feedback).value), timeout: optionalNumber(obj(action.feedback).timeoutInMin) } : undefined,
      }));
    const conditions = arr(row.conditions).map(obj).map(condition => ({ outputId: str(condition.outputId), operator: str(condition.conditionType), value: str(condition.value), relation: str(condition.relationType), deviceIds: arr(condition.devices).map(obj).map(device => str(device.deviceId)).filter(Boolean) }));
    const schedule = obj(row.timeBasedScheduleConfigurations), end = obj(schedule.endTimeSchedule), disabled = obj(row.autoDisabled);
    return { id: str(row._id), organizationId: scope.organisationId, projectId: scope.projectId, solutionId: str(row.solutionId), outputNames: arr(row.outputName).map(str), name: str(row.name) || 'Unnamed rule', active: row.active === true, triggers: arr(row.triggerTypes).map(str), schedule: str(row.scheduleName),
      scheduleConfiguration: schedule.type ? { type: str(schedule.type), interval: optionalNumber(schedule.scheduleInMin), time: str(schedule.triggerTime), secondTime: str(schedule.secondTriggerTime), endTime: schedule.triggerEndTime === true ? str(schedule.endTime) : '', date: date(schedule.triggerDate), timezone: str(schedule.triggerTimezone), repeatOn: arr(schedule.repeatOn).map(str), repeatType: str(schedule.repeatType),
        end: end.type ? { type: str(end.type), date: date(end.endDate), occurrences: optionalNumber(end.noOfOccurrences) } : undefined } : undefined,
      autoDisabled: disabled.reason ? { at: date(disabled.at), runId: str(disabled.runId), stepIndex: optionalNumber(disabled.stepIndex), reason: str(disabled.reason), deviceId: str(disabled.deviceId) } : undefined,
      conditions, actions, deviceIds: [...new Set([...arr(row.clusterConfigurations).map(obj).flatMap(cluster => arr(cluster.deviceIds).map(str)), ...conditions.flatMap(condition => condition.deviceIds), ...actions.flatMap(action => [action.deviceId, action.feedback?.deviceId || ''])].filter(Boolean))] };
  });
}
export function normalizeNotifications(value: unknown, scope: ProjectScope): Notification[] {
  return arr(value).map(obj).filter(row => matches(row, scope) && row._id && ['ACTIVE', 'ACKNOWLEDGED', 'ARCHIVED'].includes(str(row.status)))
    .map(row => ({ id: str(row._id), ruleId: str(row.alertId), deviceId: str(row.deviceId), status: row.status as Notification['status'], timestamp: date(row.timeStamp),
      count: Math.max(0, Number(row.triggeredCount) || 0), values: arr(row.outputValues).map(obj).map(value => ({ outputId: str(value.outputId), value: str(value.outputValue), label: str(value.label) })) }))
    .sort((a, b) => (Date.parse(b.timestamp || '') || 0) - (Date.parse(a.timestamp || '') || 0));
}
export function notificationDevice(item: Notification, devices: Device[], scope: ProjectScope): Device | undefined {
  return devices.find(device => device.id === item.deviceId && device.organizationId === scope.organisationId && device.projectId === scope.projectId);
}
export const RULES_QUERY = `query AlertList($alertParamsInput: AlertParamsInput!) { alerts(alertParamsInput: $alertParamsInput) {
  _id name organisationId projectId solutionId outputName active deleted triggerTypes scheduleName
  conditions { outputId conditionType value relationType devices { deviceId } }
  advanceConditions { deviceId downlinkInterfaceId value scheduleInMin port deviceClass triggerType active clusterActive
    feedback { deviceId outputId conditionType value timeoutInMin } }
  clusterConfigurations { clusterId active deviceIds }
  timeBasedScheduleConfigurations { type scheduleInMin triggerTime endTime triggerEndTime secondTriggerTime triggerDate triggerTimezone repeatOn repeatType endTimeSchedule { type endDate noOfOccurrences } }
  autoDisabled { at runId stepIndex reason deviceId }
} }`;
export const NOTIFICATIONS_QUERY = 'query Notifications($params: TriggeredAlertParamsInput!) { triggeredAlerts(triggeredAlertParamsInput: $params) { _id organisationId projectId deviceId alertId status timeStamp triggeredCount outputValues { outputId outputValue label } } }';
export const RUNS_QUERY = 'query AutomationHistory($params: AutomationRunsInput!) { automationRuns(automationRunsParams: $params) { alertId organisationId metadata { currentPage totalPages totalRecords } runs { _id organisationId projectId alertId state trigger triggerDeviceId triggeredAt finishedAt currentStep skippedTriggers abortReason cancelReason } } }';
export function createOperationsApi(request: ApiRequest): OperationsApi {
  return {
    async rules(scope, signal) {
      checkScope(scope);
      const data = await request<{ alerts: unknown }>(RULES_QUERY, { alertParamsInput: scope }, signal);
      if (!Array.isArray(data.alerts)) throw new Error('The server did not return a valid automation list. Please refresh.');
      return normalizeRules(data.alerts, scope);
    },
    async notifications(scope, signal) { checkScope(scope); const data = await request<{ triggeredAlerts: unknown }>(NOTIFICATIONS_QUERY, { params: scope }, signal); return normalizeNotifications(data.triggeredAlerts, scope); },
    async runs(scope, ruleId, page, signal) {
      checkScope(scope); if (!ruleId || !Number.isInteger(page) || page < 1) throw new Error('Choose a rule and a valid page.');
      const data = await request<{ automationRuns: unknown }>(RUNS_QUERY, { params: { alertId: ruleId, pageInfo: { pageNo: page, noOfRecordsPerPage: 20 } } }, signal);
      const root = obj(data.automationRuns), metadata = obj(root.metadata);
      if (root.organisationId !== scope.organisationId || root.alertId !== ruleId) throw new Error('Run history did not match this rule.');
      const runs = arr(root.runs).map(obj).filter(row => matches(row, scope) && row.alertId === ruleId && row._id).map(row => ({
        id: str(row._id), state: str(row.state), trigger: str(row.trigger), deviceId: str(row.triggerDeviceId), startedAt: date(row.triggeredAt), finishedAt: date(row.finishedAt),
        currentStep: Number(row.currentStep) || 0, skipped: Number(row.skippedTriggers) || 0, abortReason: str(row.abortReason), cancelReason: str(row.cancelReason),
      }));
      return { runs, page: Number(metadata.currentPage) || page, pages: Number(metadata.totalPages) || 1, total: Number(metadata.totalRecords) || 0 };
    },
  };
}
