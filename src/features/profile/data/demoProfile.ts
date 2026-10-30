import type { Organization, Profile, Project } from '../types';

export const demoProfile: Profile = {
  id: 'demo-profile',
  firstName: 'Shaheen',
  lastName: 'Ansari',
  email: 'shaheenansari2519@gmail.com',
  primaryPhone: '987654857',
  secondaryPhone: '9675846534',
  organizationId: 'senra-iot',
  projectId: 'demo',
  avatarStyle: 'default',
};
export const demoOrganizations: Organization[] = [
  { id: 'senra', name: 'SenRa' },
  { id: 'individual', name: 'Individual' },
  { id: 'senra-iot', name: 'SenRa IoT' },
];
export const demoProjects: Project[] = [
  { id: 'demo', name: 'Demo', organizationId: 'senra-iot' },
  { id: 'office', name: 'Office', organizationId: 'senra-iot' },
  { id: 'senra-demo', name: 'Demo', organizationId: 'senra' },
  { id: 'personal', name: 'Personal', organizationId: 'individual' },
];
