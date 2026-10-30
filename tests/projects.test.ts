import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectedProject, searchProjects } from '../src/features/workspace/services/projectSelection.ts';
import type { ProjectOverview } from '../src/features/workspace/types';

const projects: ProjectOverview[] = [
  { id: 'p1', organizationId: 'org1', name: 'Project - 1', description: 'Water monitoring', active: true, devices: 4, clusters: 2, users: 3, nonLoRaWANDevices: 0, location: { lat: 0, lng: 0, placeName: 'Mumbai' } },
  { id: 'p2', organizationId: 'org1', name: 'Office', description: 'Temperature sensors', active: false, devices: 0, clusters: 0, users: 1, nonLoRaWANDevices: 0 },
  { id: 'p3', organizationId: 'org2', name: 'Other organization', description: '', active: true, devices: 8, clusters: 1, users: 2, nonLoRaWANDevices: 0 },
];

test('login leaves projects unselected even if there is only one enabled project', () => {
  assert.equal(selectedProject(projects, 'org1', ''), undefined);
  assert.equal(selectedProject([projects[0]], 'org1', ''), undefined);
  assert.equal(selectedProject([], 'org1', ''), undefined);
});

test('opening a project resolves exactly that project and preserves it on refresh', () => {
  assert.equal(selectedProject(projects, 'org1', 'p1'), projects[0]);
  const refreshed = [{ ...projects[0], devices: 5 }, projects[1]];
  assert.equal(selectedProject(refreshed, 'org1', 'p1')?.devices, 5);
  assert.equal(selectedProject(projects, 'org1', 'p2'), projects[1]);
});

test('a removed project or changed organization never falls back to another project', () => {
  assert.equal(selectedProject([projects[1]], 'org1', 'p1'), undefined);
  assert.equal(selectedProject(projects, 'org2', 'p1'), undefined);
  assert.equal(selectedProject(projects, 'org1', 'p3'), undefined);
  assert.equal(selectedProject(projects, '', 'p1'), undefined);
});

test('project search matches names, descriptions, and locations without changing source data', () => {
  assert.deepEqual(searchProjects(projects, '  PROJECT - 1 '), [projects[0]]);
  assert.deepEqual(searchProjects(projects, 'temperature'), [projects[1]]);
  assert.deepEqual(searchProjects(projects, 'MUMBAI'), [projects[0]]);
  assert.equal(projects[0].devices, 4);
  assert.equal(projects[1].active, false);
});

test('clearing search restores all projects and unmatched searches are empty', () => {
  assert.deepEqual(searchProjects(projects, '  '), projects);
  assert.deepEqual(searchProjects(projects, 'missing project'), []);
});
