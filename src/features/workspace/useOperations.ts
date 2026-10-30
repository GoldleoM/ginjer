import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { authenticatedGraphql } from '../../services/graphql';
import { createOperationsApi, type AutomationRule, type Notification, type OperationsApi } from './services/operations';
import { DEVICE_REFRESH_INTERVAL_MS } from './services/devicePolling';

const liveApi = createOperationsApi(authenticatedGraphql);
type Resource<T> = { scope: string; data: T[]; busy: boolean; error: string };
const empty = <T,>(scope = '', busy = false): Resource<T> => ({ scope, data: [], busy, error: '' });
export function useOperations(organisationId: string, projectId: string, api: OperationsApi = liveApi) {
  const scope = useMemo(() => ({ organisationId, projectId }), [organisationId, projectId]);
  const key = JSON.stringify(scope);
  const [rules, setRules] = useState<Resource<AutomationRule>>(empty);
  const [notifications, setNotifications] = useState<Resource<Notification>>(empty);
  const [revision, setRevision] = useState(0);
  const isForeground = () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive'
    && (Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const [foreground, setForeground] = useState(isForeground);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const resume = () => { const active = isForeground(); setForeground(active); if (active) refresh(); };
    const sub = AppState.addEventListener('change', resume);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume);
    }
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume);
      }
    };
  }, [refresh]);
  useEffect(() => {
    if (!organisationId || !projectId || !foreground) return;
    const timer = setInterval(() => { if (isForeground()) refresh(); }, DEVICE_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [key, foreground, refresh]);
  useEffect(() => {
    if (!organisationId || !projectId || !foreground) return;
    const controller = new AbortController();
    function fetchResource<T>(fetch: () => Promise<T[]>, set: React.Dispatch<React.SetStateAction<Resource<T>>>) {
      set(previous => ({ ...(previous.scope === key ? previous : empty<T>(key)), busy: true, error: '' }));
      fetch().then(data => { if (!controller.signal.aborted) set({ scope: key, data, busy: false, error: '' }); })
        .catch(error => { if (!controller.signal.aborted) set(previous => ({ ...previous, busy: false, error: error instanceof Error ? error.message : 'Unable to load this information.' })); });
    }
    fetchResource(() => api.rules(scope, controller.signal), setRules);
    fetchResource(() => api.notifications(scope, controller.signal), setNotifications);
    return () => controller.abort();
  }, [api, key, revision, foreground]);
  return { scope, api, refresh,
    rules: rules.scope === key ? rules : empty<AutomationRule>(key, !!projectId),
    notifications: notifications.scope === key ? notifications : empty<Notification>(key, !!projectId),
  };
}
export type Operations = ReturnType<typeof useOperations>;
