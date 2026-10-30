import type { ProjectOverview } from '../types';

export function selectedProject(projects: ProjectOverview[], organizationId: string, projectId: string): ProjectOverview | undefined {
  if (!organizationId || !projectId) return undefined;
  return projects.find(project => project.id === projectId && project.organizationId === organizationId);
}

export function searchProjects(projects: ProjectOverview[], query: string): ProjectOverview[] {
  const term = query.trim().toLocaleLowerCase();
  return projects.filter(project => [project.name, project.description, project.location?.placeName]
    .filter(Boolean).join(' ').toLocaleLowerCase().includes(term));
}
