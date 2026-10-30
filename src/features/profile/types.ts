export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  primaryPhone: string;
  secondaryPhone: string;
  organizationId: string;
  projectId: string | null;
  avatarStyle: 'default' | 'initials';
}
export interface Organization { id: string; name: string; }
export interface Project { id: string; name: string; organizationId: string; }
export type ProfileErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'primaryPhone' | 'secondaryPhone', string>>;
export interface ProfileRepository {
  load(): Promise<Profile>;
  save(profile: Profile): Promise<Profile>;
  listOrganizations(): Promise<Organization[]>;
  listProjects(): Promise<Project[]>;
}
