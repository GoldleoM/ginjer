import React, { useEffect, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabs } from '../components/BottomTabs';
import type { AuthUser } from '../features/auth/types';
import type { Device } from '../features/devices/types';
import { DeviceDetailsScreen } from '../features/devices/screens/DeviceDetailsScreen';
import { authenticatedGraphql } from '../services/graphql';
import { createWorkspaceApi } from '../features/workspace/services/api';
import { useWorkspace } from '../features/workspace/useWorkspace';
import { DetailRow, Feedback, InfoDialog, liveStyles, WorkspaceBar, WorkspacePicker } from '../features/workspace/components/WorkspaceUI';
import { ConnectedDevices } from '../features/workspace/screens/ConnectedDevices';
import { ConnectedAnalytics } from '../features/workspace/screens/ConnectedAnalytics';
import { ConnectedLocations } from '../features/workspace/screens/ConnectedLocations';
import { ConnectedProfile } from '../features/workspace/screens/ConnectedProfile';
import type { Module, WorkspaceApi } from '../features/workspace/types';

const liveApi = createWorkspaceApi(authenticatedGraphql);
type Tab = 'Devices' | 'Locations' | 'Analytics' | 'Profile';
export function ConnectedNavigator({ user, onExit, api = liveApi }: { user: AuthUser; onExit: () => void; api?: WorkspaceApi }) {
  const workspace = useWorkspace(api, user);
  const [tab, setTab] = useState<Tab>('Devices');
  const [detail, setDetail] = useState<Device | null>(null);
  const [picker, setPicker] = useState<'organizations' | 'projects' | null>(null);
  const [projectInfo, setProjectInfo] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [moduleInfo, setModuleInfo] = useState<Module | null>(null);
  useEffect(() => { setDetail(null); setModuleInfo(null); setModulesOpen(false); }, [workspace.scope, workspace.account?.id]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detail) { setDetail(null); return true; }
      if (tab === 'Locations') return false;
      if (tab !== 'Devices') { setTab('Devices'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [tab, detail]);

  if (detail) return <DeviceDetailsScreen key={detail.id} device={workspace.devices.find(item => item.id === detail.id) ?? detail} onBack={() => setDetail(null)} onRefresh={workspace.refresh} refreshing={workspace.loading} error={workspace.devicesError} />;
  const body = tab === 'Profile'
    ? <ConnectedProfile user={user} workspace={workspace} onOrganizations={() => setPicker('organizations')} onProjects={() => setPicker('projects')} onLogout={onExit} />
    : workspace.loading && !workspace.devices.length ? <Feedback busy />
      : workspace.error ? <Feedback title="Unable to load workspace" message={workspace.error} onRetry={workspace.refresh} />
        : !workspace.account ? <Feedback title="No active organizations" message="You do not have an active, accepted membership. Your account details are available in Profile." />
          : !workspace.project ? <Feedback title="No projects available" message="Choose another organization to view its projects and devices." />
            : tab === 'Analytics' ? <ConnectedAnalytics key={workspace.scope} workspace={workspace} onSelect={setDetail} onModules={() => { workspace.loadModules(); setModulesOpen(true); }} />
              : tab === 'Locations' ? <ConnectedLocations key={workspace.scope} workspace={workspace} onDetails={setDetail} onBackToDevices={() => setTab('Devices')} />
                : <ConnectedDevices key={workspace.scope} workspace={workspace} onSelect={setDetail} />;
  return <SafeAreaView style={liveStyles.safe} edges={['top', 'bottom', 'left', 'right']}><View style={liveStyles.shell}>
    <WorkspaceBar organization={workspace.account?.name} project={workspace.project?.name} busy={workspace.loading}
      onOrganizations={() => setPicker('organizations')} onProjects={() => setPicker('projects')} onInfo={() => setProjectInfo(true)} onRefresh={workspace.refresh} />
    <View style={{ flex: 1, minHeight: 0, minWidth: 0 }}>{body}</View>
    <BottomTabs active={tab} onDevices={() => setTab('Devices')} onLocations={() => setTab('Locations')} onAnalytics={() => setTab('Analytics')} onProfile={() => setTab('Profile')} />
  </View>
    {picker === 'organizations' && <WorkspacePicker title="Organizations" selectedId={workspace.accountId}
      items={workspace.accounts.map(account => ({ id: account.id, name: account.name, disabled: !account.active || !account.accepted,
        subtitle: [account.admin ? 'Administrator' : 'Member', account.active ? 'Active' : 'Inactive', account.accepted ? 'Accepted' : 'Invitation pending'].join(' · ') }))}
      onClose={() => setPicker(null)} onSelect={id => { workspace.selectAccount(id); setPicker(null); }} />}
    {picker === 'projects' && <WorkspacePicker title="Projects" selectedId={workspace.projectId}
      items={workspace.projects.map(project => ({ id: project.id, name: project.name, subtitle: [
        project.active ? 'Active' : 'Inactive', project.devices + ' devices', project.clusters + ' clusters', project.users + ' members',
        project.nonLoRaWANDevices + ' non-LoRaWAN devices', project.location?.placeName, project.description,
      ].filter(Boolean).join(' · ') }))}
      onClose={() => setPicker(null)} onSelect={id => { workspace.selectProject(id); setPicker(null); }} />}
    <InfoDialog visible={projectInfo} title={workspace.project?.name || 'Project information'} onClose={() => setProjectInfo(false)}>
      <DetailRow label="Description" value={workspace.project?.description} /><DetailRow label="Status" value={workspace.project ? workspace.project.active ? 'Active' : 'Inactive' : undefined} />
      <DetailRow label="Devices" value={workspace.project?.devices} /><DetailRow label="Clusters" value={workspace.project?.clusters} />
      <DetailRow label="Members" value={workspace.project?.users} /><DetailRow label="Non-LoRaWAN devices" value={workspace.project?.nonLoRaWANDevices} />
      <DetailRow label="Place" value={workspace.project?.location?.placeName} />
      <DetailRow label="Coordinates" value={workspace.project?.location ? workspace.project.location.lat + ', ' + workspace.project.location.lng : undefined} />
      <DetailRow label="Project ID" value={workspace.project?.id} /><DetailRow label="Organization ID" value={workspace.project?.organizationId} />
    </InfoDialog>
    {modulesOpen && (workspace.modulesLoading || workspace.modulesError || !workspace.modules.length
      ? <InfoDialog visible title="Modules" onClose={() => setModulesOpen(false)}><Feedback busy={workspace.modulesLoading} title={workspace.modulesError ? 'Unable to load modules' : 'No modules available'} message={workspace.modulesError || undefined} onRetry={workspace.modulesError ? workspace.retryModules : undefined} /></InfoDialog>
      : <WorkspacePicker title={'Modules · ' + workspace.modules.length} items={workspace.modules.map(item => ({ id: item.id, name: item.name, subtitle: item.type + (item.organizationId ? ' · Organization module' : ' · Shared module') }))}
        onClose={() => setModulesOpen(false)} onSelect={id => { setModuleInfo(workspace.modules.find(item => item.id === id) ?? null); setModulesOpen(false); }} />)}
    <InfoDialog visible={!!moduleInfo} title={moduleInfo?.name || 'Module'} onClose={() => setModuleInfo(null)}>
      <DetailRow label="Type" value={moduleInfo?.type} /><DetailRow label="Module ID" value={moduleInfo?.id} />
      <DetailRow label="Organization ID" value={moduleInfo?.organizationId} /><Text style={liveStyles.caption}>{moduleInfo?.organizationId ? 'Organization module' : 'Shared module'}</Text>
    </InfoDialog>
  </SafeAreaView>;
}
