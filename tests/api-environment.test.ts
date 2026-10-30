import { test } from 'node:test';
import assert from 'node:assert/strict';

test('all build modes stay on the development API despite stale environment overrides', async () => {
  const keys = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_DEV_API_BASE_URL', 'EXPO_PUBLIC_PROD_API_BASE_URL'];
  const previous = keys.map(key => process.env[key]);
  const globals = globalThis as typeof globalThis & { __DEV__?: boolean };
  const oldMode = globals.__DEV__;
  try {
    keys.forEach(key => { process.env[key] = 'https://unused.invalid'; });
    for (const mode of [true, false]) {
      globals.__DEV__ = mode;
      const config = await import(`../src/config/env.ts?development=${mode}`);
      assert.equal(config.API_BASE_URL, 'https://devapi.ginjer.io');
      assert.equal(config.API_URL, 'https://devapi.ginjer.io/graphql');
    }
  } finally {
    keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
    if (oldMode === undefined) delete globals.__DEV__; else globals.__DEV__ = oldMode;
  }
});
