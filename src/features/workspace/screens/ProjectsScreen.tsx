import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsiveColumns, useResponsiveLayout } from '../../../layout/responsive';
import type { AuthUser } from '../../auth/types';
import type { Workspace } from '../useWorkspace';
import { ActionIcon, Feedback } from '../components/WorkspaceUI';
import { searchProjects } from '../services/projectSelection';

export function ProjectsScreen({ user, workspace, onOpen, onOrganizations, onProfile }: {
  user: AuthUser; workspace: Workspace; onOpen: (id: string) => void; onOrganizations: () => void; onProfile: () => void;
}) {
  const [query, setQuery] = useState('');
  const { isTablet } = useResponsiveLayout();
  const { columns, itemStyle, onLayout } = useResponsiveColumns(280, 16, 16, 4);
  const catalog = useMemo(() => workspace.projects.filter(project => project.organizationId === workspace.accountId), [workspace.projects, workspace.accountId]);
  const projects = useMemo(() => searchProjects(catalog, query), [catalog, query]);
  const busy = workspace.accountsLoading || workspace.projectsLoading;
  const error = workspace.accountsError || workspace.projectsError;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'My account';
  const initials = [user.firstName, user.lastName].map(value => Array.from(value || '')[0] || '').join('').toUpperCase() || 'G';
  const emptyTitle = error ? 'Unable to load projects' : !workspace.account ? 'No active organizations' : query.trim() ? 'No matching projects' : 'No projects yet';
  const emptyMessage = error || (!workspace.account ? 'Choose an active organization to view its projects.' : query.trim() ? 'Try a different project name or location.' : 'This organization has no projects to display.');

  return <View style={styles.page} onLayout={onLayout}>
    <FlatList key={columns} data={projects} numColumns={columns} keyExtractor={project => project.id}
      columnWrapperStyle={columns > 1 ? { gap: 16 } : undefined} contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={busy} onRefresh={workspace.refresh} tintColor="#8BAE41" />}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../../../../assets/images/ginjer-logo.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="Ginjer" />
          <View style={styles.accountActions}>
            {isTablet && <View style={styles.accountIdentity}><Text style={styles.userName}>{fullName}</Text><Text style={styles.role}>{workspace.account ? workspace.account.admin ? 'Administrator' : 'Member' : 'My account'}</Text></View>}
            <Pressable accessibilityRole="button" accessibilityLabel={'Open profile for ' + fullName} onPress={onProfile} style={styles.avatar}><Text style={styles.initials}>{initials}</Text></Pressable>
          </View>
        </View>
        <View style={styles.organizationRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose organization" onPress={onOrganizations} style={styles.organization}>
            <MaterialCommunityIcons name="office-building-outline" size={18} color="#7A9F2B" />
            <Text numberOfLines={1} style={styles.organizationName}>{workspace.account?.name || 'Choose organization'}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#777777" />
          </Pressable>
          {busy ? <View style={styles.refresh}><ActivityIndicator color="#8BAE41" accessibilityLabel="Loading projects" /></View>
            : <ActionIcon icon="refresh" label="Refresh projects" onPress={workspace.refresh} />}
        </View>
        <View style={[styles.toolbar, isTablet && styles.tabletToolbar]}>
          <View style={styles.titleGroup}><Text accessibilityRole="header" style={styles.title}>Projects</Text>
            <Text style={styles.subtitle}>{catalog.length} {catalog.length === 1 ? 'project' : 'projects'} · Select a project to view its devices</Text></View>
          <View style={[styles.searchBox, isTablet && styles.tabletSearch]}>
            <MaterialCommunityIcons name="magnify" size={22} color="#858585" />
            <TextInput accessibilityLabel="Search projects" placeholder="Search projects" placeholderTextColor="#999999" autoCapitalize="none" autoCorrect={false}
              returnKeyType="search" value={query} onChangeText={setQuery} style={[styles.search, Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' }]} />
            {!!query && <ActionIcon icon="close" label="Clear project search" onPress={() => setQuery('')} />}
          </View>
        </View>
        {!!error && !!projects.length && <View style={styles.errorBanner}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={workspace.refresh} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>}
      </View>}
      renderItem={({ item: project }) => <View style={itemStyle}>
        <Pressable accessibilityRole="button" accessibilityLabel={project.name + ', ' + project.devices + ' devices, ' + (project.active ? 'enabled' : 'disabled') + '. Open project'}
          onPress={() => onOpen(project.id)} style={({ pressed }) => [styles.card, pressed && styles.pressedCard]}>
          <View style={styles.cardIdentity}>
            <View style={styles.projectAvatar}><Text style={styles.projectInitial}>{Array.from(project.name.trim())[0]?.toUpperCase() || 'P'}</Text></View>
            <Text style={styles.projectName}>{project.name}</Text>
            <MaterialCommunityIcons name="chevron-right" size={21} color="#91AF57" />
          </View>
          <View style={styles.counts}>
            <View style={styles.deviceBadge}><MaterialCommunityIcons name="router-wireless" size={16} color="#303030" /><Text style={styles.deviceCount}>Devices: {project.devices}</Text></View>
            {project.nonLoRaWANDevices > 0 && <View style={styles.deviceBadge}><Text style={styles.deviceCount}>Non-LoRaWAN: {project.nonLoRaWANDevices}</Text></View>}
          </View>
          {!!project.description && <Text numberOfLines={2} style={styles.description}>{project.description}</Text>}
          {!!project.location?.placeName && <View style={styles.location}><MaterialCommunityIcons name="map-marker-outline" size={14} color="#999999" /><Text style={styles.locationText}>{project.location.placeName}</Text></View>}
          <View style={styles.cardFooter}>
            <Text style={styles.metadata}>{project.clusters} clusters · {project.users} members</Text>
            <View style={[styles.status, !project.active && styles.disabledStatus]}>
              <View style={[styles.statusDot, !project.active && { backgroundColor: '#999999' }]} /><Text style={[styles.statusText, !project.active && { color: '#777777' }]}>{project.active ? 'Enabled' : 'Disabled'}</Text>
            </View>
          </View>
        </Pressable>
      </View>}
      ListEmptyComponent={busy ? <Feedback busy /> : <View><Feedback title={emptyTitle} message={emptyMessage} onRetry={error ? workspace.refresh : undefined} />
        {!!query.trim() && !error && <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.clearSearch}><Text style={styles.retryText}>Clear search</Text></Pressable>}</View>} />
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, minWidth: 0, minHeight: 0, backgroundColor: '#FAFAFA' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  header: { paddingTop: 12, paddingBottom: 12, gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  logo: { width: 136, height: 58 }, accountActions: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, flexShrink: 1 },
  accountIdentity: { minWidth: 0, flexShrink: 1, alignItems: 'flex-end', gap: 4 }, userName: { fontSize: 14, color: '#303030', fontWeight: '600' },
  role: { color: '#858585', fontSize: 11 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDF3E2', alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#759829', fontWeight: '600', fontSize: 16 },
  organizationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  organization: { minHeight: 44, minWidth: 0, maxWidth: '85%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  organizationName: { flexShrink: 1, fontSize: 13, color: '#626262' }, refresh: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toolbar: { gap: 20, marginTop: 6, marginBottom: 8 }, tabletToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 },
  titleGroup: { minWidth: 0, flexShrink: 1, gap: 7 }, title: { fontSize: 30, lineHeight: 39, fontWeight: '600', color: '#363D42' },
  subtitle: { color: '#939393', fontSize: 12, lineHeight: 18 },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#D8D8D8', borderRadius: 12, paddingLeft: 14, paddingRight: 4, backgroundColor: 'white' },
  tabletSearch: { width: 310, maxWidth: '48%', flexShrink: 1 }, search: { flex: 1, minWidth: 0, minHeight: 46, color: '#303030', fontSize: 15, paddingVertical: 12 },
  card: { minHeight: 224, padding: 22, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F1F1' },
  pressedCard: { backgroundColor: '#F6F9F0', borderColor: '#B8CD90' },
  cardIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14 }, projectAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F3F3', borderWidth: 1, borderColor: '#EEEEEE', alignItems: 'center', justifyContent: 'center' },
  projectInitial: { fontSize: 23, color: '#999999' }, projectName: { flex: 1, minWidth: 0, fontSize: 17, fontWeight: '500', color: '#202020', lineHeight: 24 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24, marginBottom: 16 },
  deviceBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F3F3F3', borderRadius: 9, paddingHorizontal: 12, minHeight: 36 },
  deviceCount: { color: '#454545', fontSize: 11 }, description: { color: '#858585', fontSize: 12, lineHeight: 19, marginBottom: 10 },
  location: { flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: 10 }, locationText: { flex: 1, color: '#909090', fontSize: 11, lineHeight: 17 },
  cardFooter: { marginTop: 'auto', paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  metadata: { color: '#999999', fontSize: 10, lineHeight: 16, flexShrink: 1 },
  status: { backgroundColor: '#F0F6E6', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 },
  disabledStatus: { backgroundColor: '#F2F2F2' }, statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8CAF3F' }, statusText: { color: '#73962B', fontSize: 10, fontWeight: '500' },
  errorBanner: { backgroundColor: '#FFF3F0', borderRadius: 10, paddingHorizontal: 14, paddingTop: 12 }, error: { color: '#B42318', fontSize: 13, lineHeight: 20 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, retryText: { color: '#6D941B', fontWeight: '600', fontSize: 13 },
  clearSearch: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
