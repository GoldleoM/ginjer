import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabs } from '../../../components/BottomTabs';
import { ProfileAvatar, ProfileMenuRow, profileColors, profileStyles } from '../components/ProfileUI';
import type { Profile } from '../types';

export function ProfileScreen({ profile, organizationName, projectName, notice, onEdit, onOrganizations, onProjects, onLogout, onDevices, onAnalytics, onLocations }: {
  profile: Profile; organizationName: string; projectName?: string; notice: string;
  onEdit: () => void; onOrganizations: () => void; onProjects: () => void; onLogout: () => void; onDevices: () => void; onLocations: () => void; onAnalytics: () => void;
}) {
  return <SafeAreaView style={profileStyles.safe} edges={['top', 'bottom']}>
    <View style={profileStyles.shell}>
      <View style={profileStyles.header}><Text accessibilityRole="header" style={profileStyles.title}>Profile</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <ProfileAvatar firstName={profile.firstName} lastName={profile.lastName} variant={profile.avatarStyle} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{profile.firstName} {profile.lastName}</Text>
            <Text style={styles.email}>{profile.email}</Text>
          </View>
        </View>
        {notice ? <Text accessibilityLiveRegion="polite" style={profileStyles.notice}>{notice}</Text> : null}
        <View style={styles.menu}>
          <ProfileMenuRow icon="account-outline" label="My Profile" onPress={onEdit} />
          <ProfileMenuRow icon="view-dashboard-outline" label={projectName ? 'Project · ' + projectName : 'Projects · Select project'} onPress={onProjects} />
          <ProfileMenuRow icon="office-building-outline" label={'Organizations · ' + organizationName} onPress={onOrganizations} last />
        </View>
        <View style={styles.logout}><ProfileMenuRow icon="logout" label="Logout" onPress={onLogout} destructive last /></View>
      </ScrollView>
      <BottomTabs active="Profile" onLocations={onLocations} onDevices={onDevices} onAnalytics={onAnalytics} onProfile={() => {}} />
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 30, paddingBottom: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 42 },
  identityText: { flex: 1, minWidth: 0 },
  name: { fontSize: 20, lineHeight: 27, fontWeight: '600', color: profileColors.text },
  email: { fontSize: 12, lineHeight: 18, color: profileColors.muted, marginTop: 4 },
  menu: { backgroundColor: 'white', borderRadius: 8, overflow: 'hidden' },
  logout: { marginTop: 72, backgroundColor: 'white', borderRadius: 8, overflow: 'hidden' },
});
