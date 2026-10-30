# Device inspection API

Verified against the live production GraphQL schema on 2026-10-30 using read-only requests and the supplied collection session. The collection omits these operations; their availability is determined by the live backend and the signed-in account's permissions.

## Details

The existing device query now includes mainOutputId and networkInterface. The inspection screen also reads the project snapshot's log, networkServerOutputs, and jsonValue.

Hardware names, models, image URLs, GPS support, and manufacturer/tag IDs come from hardwareList(params: ParamInput!). Network names/providers come from networkList(params: ParamInput!). Module labels resolve MANUFACTURER and TAGS IDs. Only display metadata is requested; network keys and network configuration are excluded. Failures in one catalog do not discard successful catalog results or the base device details.

## Received packets

deviceHistoricalData(deviceHistoricalParams: DeviceHistoricalInput!) returns organisationId, projectId, metadata, and packets.

Input:
- organisationId and projectId are required.
- deviceId identifies the selected device. The optional clusterId is omitted for history so earlier packets from the same device in another cluster are not excluded.
- fromDate and toDate accept ISO DateTime strings. They are omitted for All time.
- mergeValue is false to retrieve packet values without carrying forward readings.
- pageInfo is { noOfRecordsPerPage: 25, pageNo: 1 }; page numbers start at 1.

Metadata: currentPage, totalPages, totalRecords, noOfRecordsPerPage.

Packet fields: _id, deviceId, clusterId, devEui, timestamp, channel, freq, rssi, snr, port, payload, outputs, jsonValue. Outputs use output IDs as keys; names are resolved from the selected device's outputs where possible. Unknown keys remain visible. Zero, false, and structured values are preserved. The API's page order is preserved.

## Activity logs

deviceLogs(deviceParamsInput: DeviceParamsInput!) accepts organisationId, projectId, clusterId, and deviceId. The result is nullable. A returned Logs object includes organisationId, projectId, clusterId, recordId, and logDetails { timestamp type message }.

A null result is an empty log, not a permission failure. Request/permission errors are shown separately. recordId must match the selected device. This log is distinct from received packet history and may be empty even when packet history exists.

## UI and verification

Details, History, and Logs are separate tabs. History defaults to All time, with 24-hour, 7-day, and 30-day filters and explicit page controls. Raw payloads expand on demand. Log entries are displayed in timestamp order and revealed 25 at a time.

History and log requests load on demand, cancel when their tab/scope changes, and reject records for another device or workspace. No sample records are inserted into live views. The integration performs only reads. No downlink, configuration, or MQTT action is invoked.

Live checks confirmed accessible historical packets with pagination, nullable activity logs, and resolvable hardware/network references. This confirms access for the supplied session and tested device, not every role or device.
