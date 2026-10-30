import { demoOrganizations, demoProfile, demoProjects } from '../data/demoProfile';
import { normalizeProfile, validateProfile } from './validation';
import type { ProfileRepository } from '../types';

// One instance per signed-in/preview session. Replace this adapter with API calls
// when the profile endpoints are available; screens depend only on the interface.
export function createDemoProfileRepository(): ProfileRepository {
  let current = { ...demoProfile };
  return {
    async load() { return { ...current }; },
    async listOrganizations() { return demoOrganizations.map(item => ({ ...item })); },
    async listProjects() { return demoProjects.map(item => ({ ...item })); },
    async save(value) {
      const next = normalizeProfile(value);
      if (Object.keys(validateProfile(next)).length) throw new Error('Please check the highlighted fields.');
      if (!demoOrganizations.some(item => item.id === next.organizationId)) throw new Error('Choose a valid organization.');
      if (next.projectId && !demoProjects.some(item => item.id === next.projectId && item.organizationId === next.organizationId)) {
        throw new Error('Choose a project in the selected organization.');
      }
      current = { ...next };
      return { ...current };
    },
  };
}
