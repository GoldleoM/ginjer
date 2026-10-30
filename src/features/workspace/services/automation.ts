import type { ApiRequest } from '../../../services/graphqlTransport';
import type { AutomationRule, ProjectScope } from './operations';

export interface AutomationStep {
  deviceId: string; interfaceId: string; value: unknown; phase: string; delay: number; attempt: number;
  dueAt?: string; sentAt?: string; succeededAt?: string; note: string; downlinkIds: string[];
  feedback?: { deviceId: string; outputId: string; operator: string; value: string; timeout: number };
}
export interface DetailedRun {
  id: string; state: string; active: boolean; trigger: string; startedAt?: string; finishedAt?: string;
  currentStep: number; reason: string; skipped: number; steps: AutomationStep[];
}
export interface RunHistory { runs: DetailedRun[]; page: number; pages: number; total: number; }
export interface RunAttempt {
  id: string; runId: string; stepIndex: number; attempt: number; transport: string; status: string;
  sentAt?: string; checkedAt?: string; failure: string; feedback: string;
}
export interface AttemptHistory { attempts: RunAttempt[]; page: number; pages: number; total: number; }
export interface AutomationCatalog { solutions: { id: string; name: string }[]; labels: Record<string, string>; }
const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const array = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const text = (v: unknown) => v == null ? '' : String(v);
const number = (v: unknown) => Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;
const date = (v: unknown) => {
  if (v == null || v === '') return undefined;
  const numeric = typeof v === 'number' || /^\d+$/.test(String(v)) ? Number(v) : NaN;
  const d = new Date(Number.isFinite(numeric) ? (numeric < 1e11 ? numeric * 1000 : numeric) : String(v));
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
};
function check(scope: ProjectScope, id: string) { if (!scope.organisationId?.trim() || !scope.projectId?.trim() || !id?.trim()) throw new Error('Choose an automation in the current project.'); }
function parent(value: unknown, scope: ProjectScope, id: string) {
  check(scope, id); const root = object(value);
  if (root.organisationId !== scope.organisationId || root.alertId !== id) throw new Error('Automation history did not match the selected organization and rule.');
  return root;
}
const metadata = (root: Record<string, unknown>, page: number) => {
  const m = object(root.metadata);
  return { page: number(m.currentPage) || page, pages: Math.max(1, number(m.totalPages)), total: number(m.totalRecords) };
};
export function normalizeRunHistory(value: unknown, scope: ProjectScope, id: string, page: number): RunHistory {
  const root = parent(value, scope, id);
  if (!Array.isArray(root.runs)) throw new Error('The server did not return valid automation runs.');
  const runs = array(root.runs).map(object).filter(r => r._id && r.organisationId === scope.organisationId && r.projectId === scope.projectId && r.alertId === id).map(r => ({
    id: text(r._id), state: text(r.state), active: r.active === true, trigger: text(r.trigger), startedAt: date(r.triggeredAt), finishedAt: date(r.finishedAt),
    currentStep: number(r.currentStep), reason: text(r.abortReason || r.cancelReason), skipped: number(r.skippedTriggers),
    steps: array(r.steps).map(object).map(s => ({ deviceId: text(s.deviceId), interfaceId: text(s.downlinkInterfaceId), value: s.value, phase: text(s.phase),
      delay: number(s.delayMin), attempt: number(s.attempt), dueAt: date(s.dueAt), sentAt: date(s.attemptSentAt), succeededAt: date(s.succeededAt), note: text(s.note), downlinkIds: array(s.downlinkIds).map(text),
      feedback: s.feedback ? { deviceId: text(object(s.feedback).deviceId), outputId: text(object(s.feedback).outputId), operator: text(object(s.feedback).conditionType), value: text(object(s.feedback).value), timeout: number(object(s.feedback).timeoutInMin) } : undefined,
    })),
  }));
  return { runs, ...metadata(root, page) };
}
export function normalizeAttempts(value: unknown, scope: ProjectScope, id: string, page: number): AttemptHistory {
  const root = parent(value, scope, id);
  if (!Array.isArray(root.downlinks)) throw new Error('The server did not return valid delivery attempts.');
  const attempts = array(root.downlinks).map(object).filter(r => r._id && r.organisationId === scope.organisationId && r.alertId === id).map(r => ({
    id: text(r._id), runId: text(r.runId), stepIndex: r.stepIndex == null ? -1 : number(r.stepIndex), attempt: number(r.attempt), transport: text(r.transport), status: text(r.status),
    sentAt: date(r.timestamp), checkedAt: date(r.checkedAt), failure: text(r.failureDetail || r.failureReason), feedback: text(r.feedbackValue),
  }));
  return { attempts, ...metadata(root, page) };
}
export function readableValue(value: unknown, depth = 0): string {
  if (value == null) return 'Not reported';
  if (typeof value !== 'object') return String(value);
  if (depth > 3) return 'Nested value';
  return Object.entries(value).map(([key, v]) => `${key}: ${readableValue(v, depth + 1)}`).join(', ') || 'Not reported';
}
export const AUTOMATION_HISTORY = `query AutomationDetails($params: AutomationRunsInput!) { automationRuns(automationRunsParams: $params) {
 alertId organisationId metadata { currentPage totalPages totalRecords }
 runs { _id organisationId projectId alertId state active trigger triggeredAt finishedAt currentStep skippedTriggers abortReason cancelReason
 steps { deviceId downlinkInterfaceId value delayMin phase attempt dueAt attemptSentAt succeededAt note downlinkIds feedback { deviceId outputId conditionType value timeoutInMin } } }
} }`;
export const AUTOMATION_ATTEMPTS = `query AutomationAttempts($params: AlertDownlinksInput!) { alertDownlinks(alertDownlinksParams: $params) {
 alertId organisationId metadata { currentPage totalPages totalRecords }
 downlinks { _id organisationId alertId runId stepIndex attempt transport status timestamp checkedAt failureReason failureDetail feedbackValue }
} }`;
const SCHEDULES = 'query AutomationSchedules($params: AlertScheduleParamsInput!) { alertSchedules(alertScheduleParamsInput: $params) { _id alertId organisationId projectId name deleted } }';
const CATALOG = 'query AutomationCatalog($params: ParamInput!) { solutionList(params: $params) { _id name organisationId deleted } modules(params: $params) { _id label organisationId } }';
const VERIFY = 'query VerifyAutomation($params: AlertParamsInput!) { alerts(alertParamsInput: $params) { _id organisationId projectId active deleted triggerTypes advanceConditions { deviceId downlinkInterfaceId } } }';
export const TOGGLE_AUTOMATION = 'mutation ToggleAutomation($params: AlertParamsInput!) { toggleAlert(alertParamsInput: $params) { _id organisationId projectId active deleted } }';
export const RUN_AUTOMATION = 'mutation RunAutomation($alertId: ID!) { manualAutomation(alertId: $alertId) }';
export function createAutomationApi(request: ApiRequest) {
  async function verify(scope: ProjectScope, rule: AutomationRule) {
    check(scope, rule.id);
    if (rule.organizationId !== scope.organisationId || rule.projectId !== scope.projectId) throw new Error('This automation belongs to a different project.');
    const data = await request<{ alerts: unknown }>(VERIFY, { params: { ...scope, alertId: rule.id } });
    const current = array(data.alerts).map(object).find(r => r._id === rule.id && r.organisationId === scope.organisationId && r.projectId === scope.projectId && r.deleted !== true);
    if (!current) throw new Error('This automation is no longer available in the selected project.');
    return current;
  }
  async function history(scope: ProjectScope, id: string, page = 1, signal?: AbortSignal) {
    check(scope, id); if (!Number.isInteger(page) || page < 1) throw new Error('Invalid history page.');
    const data = await request<{ automationRuns: unknown }>(AUTOMATION_HISTORY, { params: { alertId: id, pageInfo: { pageNo: page, noOfRecordsPerPage: 20 } } }, signal);
    return normalizeRunHistory(data.automationRuns, scope, id, page);
  }
  return {
    history,
    async attempts(scope: ProjectScope, id: string, page = 1, signal?: AbortSignal) {
      check(scope, id); if (!Number.isInteger(page) || page < 1) throw new Error('Invalid attempts page.');
      const data = await request<{ alertDownlinks: unknown }>(AUTOMATION_ATTEMPTS, { params: { alertId: id, pageInfo: { pageNo: page, noOfRecordsPerPage: 50 } } }, signal);
      return normalizeAttempts(data.alertDownlinks, scope, id, page);
    },
    async schedules(scope: ProjectScope, id: string, signal?: AbortSignal) {
      check(scope, id); const data = await request<{ alertSchedules: unknown }>(SCHEDULES, { params: { alertId: id } }, signal);
      return array(data.alertSchedules).map(object).filter(r => r.organisationId === scope.organisationId && r.projectId === scope.projectId && r.alertId === id && r.deleted !== true).map(r => ({ id: text(r._id), name: text(r.name) }));
    },
    async catalog(scope: ProjectScope, signal?: AbortSignal): Promise<AutomationCatalog> {
      check(scope, 'catalog'); const data = await request<{ solutionList: unknown; modules: unknown }>(CATALOG, { params: { organisationId: scope.organisationId, projectId: scope.projectId } }, signal);
      const belongs = (r: Record<string, unknown>) => !r.organisationId || r.organisationId === scope.organisationId;
      return { solutions: array(data.solutionList).map(object).filter(r => r._id && belongs(r) && r.deleted !== true).map(r => ({ id: text(r._id), name: text(r.name) })),
        labels: Object.fromEntries(array(data.modules).map(object).filter(r => r._id && belongs(r)).map(r => [text(r._id), text(r.label)])) };
    },
    async toggle(scope: ProjectScope, rule: AutomationRule, enabled: boolean) {
      const current = await verify(scope, rule);
      if (current.active === enabled) return enabled;
      const data = await request<{ toggleAlert: unknown }>(TOGGLE_AUTOMATION, { params: { ...scope, alertId: rule.id } });
      const result = object(data.toggleAlert);
      if (result._id !== rule.id || result.organisationId !== scope.organisationId || result.projectId !== scope.projectId || result.deleted === true || result.active !== enabled) throw new Error('The server did not confirm the requested state. Refresh before trying again.');
      return enabled;
    },
    async run(scope: ProjectScope, rule: AutomationRule) {
      const current = await verify(scope, rule);
      if (!array(current.triggerTypes).includes('MANUAL') || !array(current.advanceConditions).map(object).some(action => action.deviceId && action.downlinkInterfaceId)) throw new Error('This automation does not support a manual run.');
      const latest = await history(scope, rule.id);
      if (latest.runs.some(r => r.state === 'RUNNING')) throw new Error('This automation is already running.');
      const data = await request<{ manualAutomation: unknown }>(RUN_AUTOMATION, { alertId: rule.id });
      if (data.manualAutomation !== true) throw new Error('The server did not accept the run request. Refresh run history before trying again.');
    },
  };
}
export type AutomationApi = ReturnType<typeof createAutomationApi>;
