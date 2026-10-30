import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAccounts, normalizeDevices, normalizeProjects, normalizeModules, coordinates, displayValue, timestamp, withHardwareImages } from '../src/features/workspace/services/normalizers.ts';

test('normalizes memberships without treating inactive invitations as accessible', () => {
  assert.deepEqual(normalizeAccounts([{organisationId:'org',name:'Org',isActive:false,isAccepted:false,isAdmin:true},{}]), [
    {id:'org',name:'Org',active:false,accepted:false,admin:true},
  ]);
});
test('preserves project counts, descriptions, zero coordinates, and inactive projects', () => {
  const [project] = normalizeProjects([{_id:'p',name:'Project',active:false,organisationId:'o',description:'Details',
    location:{lat:0,lng:0,placeName:'Origin'},deviceCount:[{deviceCount:0},{deviceCount:3}],userCount:[{userCount:2}],clusterCount:[{clusterCount:1}],nonLoRaWANDeviceCount:[{nonLoRaWANDeviceCount:4}]}]);
  assert.equal(project.devices,3); assert.equal(project.users,2); assert.equal(project.nonLoRaWANDevices,4);
  assert.equal(project.description,'Details'); assert.equal(project.active,false); assert.equal(project.location?.lat,0);
});
test('shows false and zero readings, all attributes and metadata, without fixture fallbacks', () => {
  const [device] = normalizeDevices([{_id:'p',name:'Real project',clusters:[{_id:'c',name:'Cluster',devices:[{
    _id:'d',name:'Sensor',hardwareId:'HW',devEui:'EUI',organisationId:'o',projectId:'p',clusterId:'c',networkId:'net',hardwareType:'sensor',
    description:'Live sensor',timestamp:'2026-10-30T00:00:00Z',position:{lat:0,lng:0,placeName:'Origin'},deleted:true,
    outputs:[{outputId:'zero',outputName:'Counter',value:0,label:null,color:null},{outputId:'false',outputName:'Switch',value:false,label:'Disabled',color:'red'}],
    attributes:[{attributeId:'a',attributeName:'Calibration',value:{offset:0}},{attributeId:'b',attributeName:'Enabled',value:false}],
  }]}]}],Date.parse('2026-10-30T01:00:00Z'));
  assert.equal(device.source,'live'); assert.equal(device.image,undefined);
  assert.equal(device.readings[0].value,'0'); assert.equal(device.readings[0].tone,'neutral');
  assert.equal(device.readings[1].value,'false'); assert.equal(device.readings[1].label,'Disabled');
  assert.equal(device.attributes?.[0].value,'{"offset":0}'); assert.equal(device.attributes?.[1].value,'false');
  assert.equal(device.coordinates?.lat,0); assert.equal(device.networkId,'net'); assert.equal(device.clusterName,'Cluster');
  assert.equal(device.deleted,true); assert.equal(device.recent,true); assert.equal(device.needsAttention,true);
});
test('missing readings and coordinates stay unavailable instead of being fabricated', () => {
  const [device] = normalizeDevices([{clusters:[{devices:[{_id:'d',timestamp:'invalid',position:{lat:null,lng:20}}]}]}]);
  assert.equal(device.coordinates,undefined); assert.equal(device.timestamp,undefined); assert.equal(device.location,'Not reported');
  assert.equal(device.lastHeard,'Not reported'); assert.equal(device.mainOutput,'No outputs');
  assert.deepEqual(device.readings,[]); assert.deepEqual(device.attributes,[]);
  assert.equal(displayValue(null),'Not reported'); assert.equal(displayValue(''),'Not reported');
});
test('rejects malformed coordinates and normalizes seconds/milliseconds timestamps', () => {
  for (const value of [{lat:91,lng:0},{lat:0,lng:181},{lat:' ',lng:0},{lat:false,lng:0},{lat:null,lng:0}]) assert.equal(coordinates(value),undefined);
  assert.deepEqual(coordinates({lat:'0',lng:'0'}),{lat:0,lng:0,placeName:''});
  assert.equal(timestamp(1700000000),timestamp(1700000000000)); assert.equal(timestamp('bad'),undefined);
});
test('module catalog keeps shared and organization modules without guessed configurations', () => {
  assert.deepEqual(normalizeModules([{_id:'m',label:'Module',moduleType:'custom',organisationId:null}]),[{id:'m',name:'Module',type:'custom',organizationId:null}]);
});
test('device thumbnails resolve shared and current-organization hardware before opening details', () => {
  const devices = normalizeDevices([{ _id: 'p', clusters: [{ devices: [
    { _id: 'a', organisationId: 'org', hardwareId: 'shared' },
    { _id: 'b', organisationId: 'org', hardwareId: 'owned' },
    { _id: 'c', organisationId: 'org', hardwareId: 'foreign' },
    { _id: 'd', organisationId: 'org', hardwareId: 'unsafe' },
  ] }] }]);
  const result = withHardwareImages(devices, [
    { _id: 'shared', image: { location: 'https://example.test/shared.png' } },
    { _id: 'owned', organisationId: 'org', image: { location: 'https://example.test/owned.png' } },
    { _id: 'foreign', organisationId: 'other', image: { location: 'https://example.test/foreign.png' } },
    { _id: 'unsafe', image: { location: 'javascript:alert(1)' } },
  ], 'org');
  assert.deepEqual(result[0].image, { uri: 'https://example.test/shared.png' });
  assert.deepEqual(result[1].image, { uri: 'https://example.test/owned.png' });
  assert.equal(result[2].image, undefined); assert.equal(result[3].image, undefined);
  assert.ok(devices.every(device => device.image === undefined));
  assert.deepEqual(withHardwareImages(devices, null, 'org'), devices);
});
