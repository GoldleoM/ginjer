import React, { useEffect, useState } from 'react';
import { responsiveStyles } from '../../../layout/responsive';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AuthUser } from '../../auth/types';
import { ProfileAvatar, ProfileMenuRow } from '../../profile/components/ProfileUI';
import type { Workspace } from '../useWorkspace';
import { DetailRow, InfoDialog, liveStyles } from '../components/WorkspaceUI';
import { EditAccountDialog } from '../components/EditAccountDialog';
import type { AccountIdentity } from '../../auth/services/accountApi';

export function ConnectedProfile({ user, workspace, onOrganizations, onProjects, onLogout, onUserUpdated }: {
  user: AuthUser; workspace: Workspace; onOrganizations: () => void; onProjects: () => void; onLogout: () => void; onUserUpdated: (identity: AccountIdentity) => void;
}) {
  const [details, setDetails] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => { workspace.refreshAccounts(); }, [workspace.refreshAccounts]);
  const otherAccounts = workspace.accounts.filter(account => account.id !== workspace.account?.id);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'My account';
  return <View style={{ flex: 1 }}><ScrollView contentContainerStyle={[styles.content, responsiveStyles.readable]}>
    <Text accessibilityRole="header" style={[liveStyles.heading, { textAlign: 'center', marginBottom: 30 }]}>Profile</Text>
    <View style={styles.identity}><ProfileAvatar firstName={user.firstName || ''} lastName={user.lastName || ''} variant="initials" />
      <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.name}>{fullName}</Text><Text selectable style={styles.email}>{user.emailId}</Text></View>
    </View>
    {!!workspace.account && <Text style={styles.role}>{workspace.account.admin ? 'Administrator' : 'Member'} · {workspace.account.name}</Text>}
    <View style={styles.menu}>
      <ProfileMenuRow icon="account-outline" label="My Profile" onPress={() => setDetails(true)} />
      <ProfileMenuRow icon="account-edit-outline" label="Edit name" onPress={() => setEditing(true)} />
      <ProfileMenuRow icon="view-dashboard-outline" label={'Project · ' + (workspace.project?.name || 'Choose project')} onPress={onProjects} />
      <ProfileMenuRow icon="office-building-outline" label={'Organizations · ' + (workspace.account?.name || 'Choose organization')} onPress={onOrganizations} last />
    </View>
    <View style={{ marginTop: 28, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text accessibilityRole="header" style={liveStyles.heading}>Other organizations</Text>
        {workspace.accountsLoading ? <ActivityIndicator color="#83AF23" accessibilityLabel="Refreshing organizations" /> : <Pressable accessibilityRole="button" onPress={workspace.refreshAccounts} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#6D941B' }}>Refresh</Text></Pressable>}
      </View>
      {!!workspace.accountsError && <Text accessibilityRole="alert" style={{ color: '#B42318', lineHeight: 22 }}>{workspace.accountsError}</Text>}
      {otherAccounts.map(account => <Pressable key={account.id} accessibilityRole="button" accessibilityState={{ disabled: !account.active || !account.accepted }} disabled={!account.active || !account.accepted}
        onPress={() => { workspace.selectAccount(account.id); onProjects(); }} style={[liveStyles.card, (!account.active || !account.accepted) && { opacity: 0.6 }]}>
        <Text style={{ color: '#303030', fontSize: 16, fontWeight: '500' }}>{account.name}</Text>
        <Text style={liveStyles.caption}>{!account.accepted ? 'Invitation pending' : !account.active ? 'Membership inactive' : account.admin ? 'Administrator' : 'Member'}</Text>
      </Pressable>)}
      {!workspace.accountsLoading && !workspace.accountsError && !otherAccounts.length && <Text style={liveStyles.caption}>The server returned no other organizations for {user.emailId}.</Text>}
    </View>
    <View style={styles.logout}><ProfileMenuRow icon="logout" label="Logout" onPress={onLogout} destructive last /></View>
  </ScrollView>
    <InfoDialog visible={details} title="Account details" onClose={() => setDetails(false)}>
      <DetailRow label="First name" value={user.firstName} /><DetailRow label="Last name" value={user.lastName} /><DetailRow label="Email" value={user.emailId} />
      <DetailRow label="User ID" value={user._id} /><DetailRow label="Organization" value={workspace.account?.name} />
      <DetailRow label="Role" value={workspace.account ? workspace.account.admin ? 'Administrator' : 'Member' : undefined} />
      <DetailRow label="Membership" value={workspace.account ? 'Active · Accepted' : undefined} />
      <DetailRow label="Organization ID" value={workspace.account?.id} /><DetailRow label="Default account" value={user.defaultAccount} />
      <DetailRow label="Sign-in organization ID" value={user.organisationId} />
    </InfoDialog>
    {editing && <EditAccountDialog user={user} onClose={() => setEditing(false)} onSaved={onUserUpdated} />}
  </View>;
}
const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 20, paddingBottom: 32 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 18 },
  name: { color: '#303030', fontSize: 21, fontWeight: '600', lineHeight: 28 }, email: { color: '#858585', fontSize: 12, lineHeight: 20, marginTop: 5 },
  role: { color: '#6D941B', fontSize: 12, marginBottom: 28, lineHeight: 19 }, menu: { backgroundColor: 'white', borderRadius: 9, overflow: 'hidden', marginTop: 10 },
  logout: { marginTop: 64, backgroundColor: 'white', borderRadius: 9, overflow: 'hidden' },
});
