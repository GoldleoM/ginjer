import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startDevicePolling, DEVICE_REFRESH_INTERVAL_MS } from '../src/features/workspace/services/devicePolling.ts';

test('refreshes device readings every ten seconds without overlapping requests', async context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  const calls: boolean[] = [];
  let finish!: () => void;
  const poller = startDevicePolling(initial => { calls.push(initial); return new Promise<void>(resolve => { finish = resolve; }); }, () => true);
  assert.deepEqual(calls, [true]);
  context.mock.timers.tick(DEVICE_REFRESH_INTERVAL_MS * 3);
  assert.equal(calls.length, 1);
  finish(); await Promise.resolve();
  context.mock.timers.tick(DEVICE_REFRESH_INTERVAL_MS);
  assert.deepEqual(calls, [true, false]);
  poller.stop(); finish(); await Promise.resolve();
  context.mock.timers.tick(DEVICE_REFRESH_INTERVAL_MS * 3);
  poller.refresh();
  assert.equal(calls.length, 2);
});
test('pauses while backgrounded and allows immediate refresh on return', async context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  let active = true, calls = 0;
  const poller = startDevicePolling(async () => { calls++; }, () => active);
  await Promise.resolve(); active = false;
  context.mock.timers.tick(DEVICE_REFRESH_INTERVAL_MS * 3); poller.refresh();
  assert.equal(calls, 1);
  active = true; poller.refresh(); await Promise.resolve();
  assert.equal(calls, 2);
  context.mock.timers.tick(DEVICE_REFRESH_INTERVAL_MS);
  assert.equal(calls, 3);
  poller.stop();
});
