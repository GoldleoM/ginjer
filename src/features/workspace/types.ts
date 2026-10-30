import type { Device } from '../devices/types';
export interface Account {
  id: string; name: string; active: boolean; accepted: boolean; admin: boolean;
}
export interface Coordinates { lat: number; lng: number; placeName?: string; }
export interface ProjectOverview {
  id: string; name: string; description: string; active: boolean; organizationId: string;
  location?: Coordinates;
  users: number; devices: number; clusters: number; nonLoRaWANDevices: number;
}
export interface Module {
  id: string; name: string; type: string; organizationId: string | null;
}
export interface WorkspaceApi {
  accounts(signal?: AbortSignal, expectedUserId?: string): Promise<Account[]>;
  projects(organizationId: string, signal?: AbortSignal): Promise<ProjectOverview[]>;
  devices(organizationId: string, projectId: string, signal?: AbortSignal): Promise<Device[]>;
  modules(organizationId: string, signal?: AbortSignal): Promise<Module[]>;
}
