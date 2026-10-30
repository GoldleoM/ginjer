import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { ProjectsScreen } from '../features/workspace/screens/ProjectsScreen';
import { ConnectedProfile } from '../features/workspace/screens/ConnectedProfile';
import type { Module, WorkspaceApi } from '../features/workspace/types';
import { useOperations } from '../features/workspace/useOperations';
import { ConnectedAutomation, ConnectedNotifications, NotificationBanner } from '../features/workspace/screens/ConnectedOperations';
import { ConnectedHealth } from '../features/workspace/screens/ConnectedHealth';
import type { AccountIdentity } from '../features/auth/services/accountApi';

const liveApi = createWorkspaceApi(authenticatedGraphql);
type Tab = 'Projects' | 'Devices' | 'Locations' | 'Analytics' | 'Profile' | 'Notifications' | 'Automation' | 'Health';
export function ConnectedNavigator({ user, onExit, onUserUpdated, api = liveApi }: { user: AuthUser; onExit: () => void; onUserUpdated: (identity: AccountIdentity) => void; api?: WorkspaceApi }) {
  const workspace = useWorkspace(api, user);
  const operations = useOperations(workspace.account?.id || '', workspace.project?.id || '');
  const [tab, setTab] = useState<Tab>('Projects');
  const [detail, setDetail] = useState<Device | null>(null);
  const [picker, setPicker] = useState<'organizations' | null>(null);
  const [projectInfo, setProjectInfo] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [moduleInfo, setModuleInfo] = useState<Module | null>(null);
  const activeTab: Tab = tab === 'Profile' || workspace.project ? tab : 'Projects';
  function showProjects() {
    setDetail(null); setProjectInfo(false); setModulesOpen(false); setModuleInfo(null);
    workspace.clearProject(); setTab('Projects');
  }
  function openProject(id: string) {
    if (workspace.selectProject(id)) setTab('Devices');
  }
  useEffect(() => { setDetail(null); setProjectInfo(false); setModuleInfo(null); setModulesOpen(false); }, [workspace.scope, workspace.account?.id]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detail) { setDetail(null); return true; }
      if (activeTab === 'Locations') return false;
      if (activeTab === 'Devices') { showProjects(); return true; }
      if (activeTab !== 'Projects') { setTab(workspace.project ? 'Devices' : 'Projects'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [activeTab, detail, workspace.project]);

  if (detail) return <DeviceDetailsScreen key={detail.id} device={workspace.devices.find(item => item.id === detail.id) ?? detail} onBack={() => setDetail(null)} onRefresh={workspace.refresh} refreshing={workspace.loading} error={workspace.devicesError} />;
  const body = activeTab === 'Projects'
    ? <ProjectsScreen key={workspace.accountId} user={user} workspace={workspace} onOpen={openProject} onOrganizations={() => setPicker('organizations')} onProfile={() => setTab('Profile')} />
    : activeTab === 'Profile'
      ? <ConnectedProfile user={user} workspace={workspace} onOrganizations={() => setPicker('organizations')} onProjects={showProjects} onLogout={onExit} onUserUpdated={onUserUpdated} />
    : workspace.loading && !workspace.devices.length ? <Feedback busy />
      : workspace.error ? <Feedback title="Unable to load workspace" message={workspace.error} onRetry={workspace.refresh} />
        : !workspace.account ? <Feedback title="No active organizations" message="You do not have an active, accepted membership. Your account details are available in Profile." />
          : !workspace.project ? <Feedback title="No projects available" message="Choose another organization to view its projects and devices." />
            : activeTab === 'Notifications' ? <ConnectedNotifications key={workspace.scope} operations={operations} devices={workspace.devices} onDevice={setDetail} />
              : activeTab === 'Automation' ? <ConnectedAutomation key={workspace.scope} operations={operations} devices={workspace.devices} onDevice={setDetail} />
              : activeTab === 'Health' ? <ConnectedHealth key={workspace.scope} workspace={workspace} onSelect={setDetail} />
              : activeTab === 'Analytics' ? <ConnectedAnalytics key={workspace.scope} workspace={workspace} onSelect={setDetail} onModules={() => { workspace.loadModules(); setModulesOpen(true); }} />
              : activeTab === 'Locations' ? <ConnectedLocations key={workspace.scope} workspace={workspace} onDetails={setDetail} onBackToDevices={() => setTab('Devices')} />
                : <ConnectedDevices key={workspace.scope} workspace={workspace} onSelect={setDetail} />;
  return <SafeAreaView style={liveStyles.safe} edges={['top', 'bottom', 'left', 'right']}><View style={liveStyles.shell}>
    {activeTab !== 'Projects' && <WorkspaceBar organization={workspace.account?.name} project={workspace.project?.name} busy={workspace.loading}
      onOrganizations={() => setPicker('organizations')} onProjects={showProjects} onInfo={() => setProjectInfo(true)} onRefresh={() => { workspace.refresh(); operations.refresh(); }} />}
    {!!workspace.project && activeTab !== 'Profile' && <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {(['Notifications', 'Automation', 'Health'] as const).map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: activeTab === item }} onPress={() => setTab(item)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: activeTab === item ? '#83AF23' : '#DDDDDD', backgroundColor: activeTab === item ? '#F1F6E7' : 'white' }}>
          <MaterialCommunityIcons name={item === 'Notifications' ? 'bell-outline' : item === 'Automation' ? 'cog-sync-outline' : 'heart-pulse'} size={19} color="#6D941B" />
          <Text style={{ color: '#6D941B', fontSize: 12 }}>{item}{item === 'Notifications' && !operations.notifications.error && operations.notifications.data.some(item => item.status === 'ACTIVE') ? ' (' + operations.notifications.data.filter(item => item.status === 'ACTIVE').length + ')' : ''}</Text>
        </Pressable>)}
      </ScrollView>
      {activeTab !== 'Notifications' && <NotificationBanner operations={operations} devices={workspace.devices} onDevice={setDetail} onNotifications={() => setTab('Notifications')} />}
    </>}
    <View style={{ flex: 1, minHeight: 0, minWidth: 0 }}>{body}</View>
    <BottomTabs active={activeTab} onProjects={showProjects} projectSelected={!!workspace.project} onDevices={() => setTab('Devices')} onLocations={() => setTab('Locations')} onAnalytics={() => setTab('Analytics')} onProfile={() => setTab('Profile')} />
  </View>
    {picker === 'organizations' && <WorkspacePicker title="Organizations" selectedId={workspace.accountId}
      items={workspace.accounts.map(account => ({ id: account.id, name: account.name, disabled: !account.active || !account.accepted,
        subtitle: [account.admin ? 'Administrator' : 'Member', account.active ? 'Active' : 'Inactive', account.accepted ? 'Accepted' : 'Invitation pending'].join(' · ') }))}
      onClose={() => setPicker(null)} onSelect={id => {
        if (id !== workspace.accountId) { workspace.selectAccount(id); setTab('Projects'); }
        setPicker(null);
      }} />}
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
