import { useEffect, useMemo, useState } from 'react';
import type { Device } from '../devices/types';
import { authenticatedGraphql } from '../../services/graphql';
import { createDeviceInspectionApi, deviceScope, type DeviceInspection, type DeviceInspectionApi, type DeviceLog, type HistoryRange, type PacketHistory } from './services/deviceInspection';

export type InspectionTab = 'details' | 'history' | 'logs';
type Resource<T> = { key: string; data?: T; busy: boolean; error?: string };
const liveApi = createDeviceInspectionApi(authenticatedGraphql);
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to load this information. Please try again.';

export function useDeviceInspection(device: Device, tab: InspectionTab, api: DeviceInspectionApi = liveApi) {
  const scope = useMemo(() => deviceScope(device), [device.id, device.organizationId, device.projectId, device.clusterId, device.source]);
  const scopeKey = JSON.stringify(scope);
  const [revision, setRevision] = useState(0);
  const [range, setRangeValue] = useState<HistoryRange>('all');
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<Resource<DeviceInspection>>({ key: '', busy: false });
  const [history, setHistory] = useState<Resource<PacketHistory>>({ key: '', busy: false });
  const [logs, setLogs] = useState<Resource<DeviceLog[]>>({ key: '', busy: false });
  const detailsKey = scopeKey + ':' + device.hardwareId + ':' + device.networkId + ':' + revision;
  const historyKey = scopeKey + ':' + range + ':' + page + ':' + revision;
  const logsKey = scopeKey + ':' + revision;
  const missingScope = 'This device is missing the workspace identifiers needed to retrieve its records.';

  useEffect(() => {
    if (!scope) { setDetails({ key: detailsKey, busy: false, error: missingScope }); return; }
    const controller = new AbortController();
    setDetails({ key: detailsKey, busy: true });
    api.details(device, controller.signal)
      .then(data => { if (!controller.signal.aborted) setDetails({ key: detailsKey, data, busy: false }); })
      .catch(error => { if (!controller.signal.aborted) setDetails({ key: detailsKey, error: message(error), busy: false }); });
    return () => controller.abort();
  }, [api, detailsKey]);

  useEffect(() => {
    if (tab !== 'history') return;
    if (!scope) { setHistory({ key: historyKey, busy: false, error: missingScope }); return; }
    const controller = new AbortController();
    setHistory({ key: historyKey, busy: true });
    api.history(scope, range, page, controller.signal)
      .then(data => { if (!controller.signal.aborted) setHistory({ key: historyKey, data, busy: false }); })
      .catch(error => { if (!controller.signal.aborted) setHistory({ key: historyKey, error: message(error), busy: false }); });
    return () => controller.abort();
  }, [api, tab, historyKey]);

  useEffect(() => {
    if (tab !== 'logs') return;
    if (!scope) { setLogs({ key: logsKey, busy: false, error: missingScope }); return; }
    const controller = new AbortController();
    setLogs({ key: logsKey, busy: true });
    api.logs(scope, controller.signal)
      .then(data => { if (!controller.signal.aborted) setLogs({ key: logsKey, data, busy: false }); })
      .catch(error => { if (!controller.signal.aborted) setLogs({ key: logsKey, error: message(error), busy: false }); });
    return () => controller.abort();
  }, [api, tab, logsKey]);

  const current = <T,>(resource: Resource<T>, key: string): Resource<T> => resource.key === key ? resource : { key, busy: true };
  return {
    details: current(details, detailsKey), history: current(history, historyKey), logs: current(logs, logsKey),
    range, page, setPage, setRange: (value: HistoryRange) => { setRangeValue(value); setPage(1); },
    refresh: () => setRevision(value => value + 1),
  };
}
