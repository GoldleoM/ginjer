import type { ApiRequest } from '../../../services/graphqlTransport';
import type { WorkspaceApi } from '../types';
import { normalizeAccounts, normalizeDevices, normalizeModules, normalizeProjects } from './normalizers';
import { fetchMemberships } from './memberships';

const PROJECTS = 'query ProjectList($params: ParamInput!) { projectOverview(params: $params) { _id name description active organisationId location { placeName lat lng } userCount { _id userCount } deviceCount { _id deviceCount } clusterCount { _id clusterCount } nonLoRaWANDeviceCount { _id nonLoRaWANDeviceCount } } }';
const DEVICES = 'query DeviceDetails($params: ParamInput!) { projects(params: $params) { _id name clusters { _id name devices { _id name description devEui organisationId projectId clusterId hardwareId networkId hardwareType mainOutputId networkInterface timestamp deleted position { placeName lat lng } outputs { outputId outputModuleType outputName value label color } attributes { attributeId attributeName value } } } } }';
const MODULES = 'query ModuleList($params: ParamInput!) { modules(params: $params) { _id label moduleType organisationId } }';
export function createWorkspaceApi(request: ApiRequest): WorkspaceApi {
  return {
    async accounts(signal, expectedUserId) { return normalizeAccounts(await fetchMemberships(request, signal, expectedUserId)); },
    async projects(organisationId, signal) { const data = await request<{ projectOverview: unknown }>(PROJECTS, { params: { organisationId } }, signal); return normalizeProjects(data.projectOverview); },
    async devices(organisationId, projectId, signal) { const data = await request<{ projects: unknown }>(DEVICES, { params: { organisationId, projectId } }, signal); return normalizeDevices(data.projects); },
    async modules(organisationId, signal) { const data = await request<{ modules: unknown }>(MODULES, { params: { organisationId } }, signal); return normalizeModules(data.modules); },
  };
}
