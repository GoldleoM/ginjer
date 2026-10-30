import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '../auth/types';
import type { Device } from '../devices/types';
import type { Account, Module, ProjectOverview, WorkspaceApi } from './types';
import { selectedProject } from './services/projectSelection';

const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to load this information. Please try again.';
export function useWorkspace(api: WorkspaceApi, user: AuthUser) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');
  const [projects, setProjects] = useState<ProjectOverview[]>([]);
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [deviceData, setDeviceData] = useState<{ scope: string; items: Device[] }>({ scope: '', items: [] });
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState('');
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [modulesEnabled, setModulesEnabled] = useState(false);
  const [moduleData, setModuleData] = useState<{ scope: string; items: Module[] }>({ scope: '', items: [] });
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState('');
  const [moduleRevision, setModuleRevision] = useState(0);
  const account = accounts.find(item => item.id === accountId && item.active && item.accepted);
  const project = account ? selectedProject(projects, accountId, projectId) : undefined;
  const scope = accountId + ':' + projectId;

  useEffect(() => {
    const controller = new AbortController();
    setAccountsLoading(true); setAccountsError('');
    api.accounts(controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setAccounts(items);
      setAccountId(current => items.some(item => item.id === current && item.active && item.accepted) ? current
        : items.find(item => (item.id === user.organisationId || item.id === user.defaultAccount) && item.active && item.accepted)?.id
          ?? items.find(item => item.active && item.accepted)?.id ?? '');
    }).catch(error => { if (!controller.signal.aborted) setAccountsError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setAccountsLoading(false); });
    return () => controller.abort();
  }, [api, user.organisationId, user.defaultAccount, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setProjects(previous => previous.filter(item => item.organizationId === accountId)); setProjectsError('');
    if (!account) { setProjectsLoading(false); return; }
    setProjectsLoading(true);
    api.projects(account.id, controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setProjects(items);
      setProjectId(current => selectedProject(items, account.id, current)?.id ?? '');
    }).catch(error => { if (!controller.signal.aborted) setProjectsError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setProjectsLoading(false); });
    return () => controller.abort();
  }, [api, account?.id, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setDeviceData(previous => previous.scope === scope ? previous : { scope: '', items: [] }); setDevicesError('');
    if (!account || !project) { setDevicesLoading(false); return; }
    setDevicesLoading(true);
    api.devices(account.id, project.id, controller.signal).then(items => {
      if (!controller.signal.aborted) { setDeviceData({ scope, items }); setUpdatedAt(new Date().toISOString()); }
    }).catch(error => { if (!controller.signal.aborted) setDevicesError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setDevicesLoading(false); });
    return () => controller.abort();
  }, [api, account?.id, project?.id, scope, revision]);

  useEffect(() => {
    const controller = new AbortController();
    if (!modulesEnabled || !account) { setModulesLoading(false); return; }
    setModulesLoading(true); setModulesError('');
    api.modules(account.id, controller.signal).then(items => {
      if (!controller.signal.aborted) setModuleData({ scope: account.id, items });
    }).catch(error => { if (!controller.signal.aborted) setModulesError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setModulesLoading(false); });
    return () => controller.abort();
  }, [api, account?.id, modulesEnabled, moduleRevision]);

  function selectAccount(id: string) {
    if (!accounts.some(item => item.id === id && item.active && item.accepted) || id === accountId) return;
    clearProject(); setProjectsLoading(true); setProjects([]);
    setAccountId(id);
  }
  function selectProject(id: string) {
    if (!account || !selectedProject(projects, accountId, id)) return false;
    if (id !== projectId) {
      setDevicesLoading(true); setDevicesError(''); setUpdatedAt(undefined);
      setDeviceData({ scope: '', items: [] }); setProjectId(id);
    }
    return true;
  }
  function clearProject() {
    setProjectId(''); setDeviceData({ scope: '', items: [] }); setDevicesError('');
    setDevicesLoading(false); setUpdatedAt(undefined);
    setModulesEnabled(false); setModuleData({ scope: '', items: [] }); setModulesError('');
  }
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  return {
    accounts, account, accountId, accountsLoading, accountsError, projects, project, projectId, projectsLoading, projectsError,
    devices: account && project && deviceData.scope === scope ? deviceData.items : [], devicesLoading, devicesError, updatedAt, scope,
    selectAccount, selectProject, clearProject, refresh, loading: accountsLoading || projectsLoading || devicesLoading,
    error: accountsError || projectsError || devicesError,
    modules: account && moduleData.scope === accountId ? moduleData.items : [], modulesLoading, modulesError,
    loadModules: () => setModulesEnabled(true), retryModules: () => setModuleRevision(value => value + 1),
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
