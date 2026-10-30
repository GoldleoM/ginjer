import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGraphqlTransport, type ApiRequest } from '../src/services/graphqlTransport.ts';
import { fetchMemberships } from '../src/features/workspace/services/memberships.ts';
import { normalizeAccounts } from '../src/features/workspace/services/normalizers.ts';

test('membership refresh uses the verified session token and includes other organizations', async () => {
  let token = 'old-session';
  const calls: string[] = [];
  const request = createGraphqlTransport({ url: 'https://api.example.test/graphql', getToken: async () => token, saveToken: async next => { token = next; }, onExpired: async () => {},
    fetcher: (async (_url, init) => {
      const query = JSON.parse(String(init?.body)).query;
      calls.push(query);
      if (query.includes('verify(')) return new Response(JSON.stringify({ data: { verify: { _id: 'user' }, token: 'verified-session' } }));
      assert.equal((init?.headers as Record<string, string>).authorization, 'verified-session');
      return new Response(JSON.stringify({ data: { accounts: [
        { organisationId: 'own', name: 'Home organization', isActive: true, isAccepted: true, isAdmin: true },
        { organisationId: 'other', name: 'SenRa', isActive: true, isAccepted: true, isAdmin: false },
        { organisationId: 'pending', name: 'Pending organization', isActive: true, isAccepted: false, isAdmin: false },
      ] } }));
    }) as typeof fetch });
  const accounts = normalizeAccounts(await fetchMemberships(request, undefined, 'user'));
  assert.equal(calls.length, 2); assert.match(calls[0], /verify/); assert.match(calls[1], /accounts/);
  assert.deepEqual(accounts.map(account => account.name), ['Home organization', 'SenRa', 'Pending organization']);
  assert.equal(accounts[1].accepted, true); assert.equal(accounts[1].admin, false);
});

test('a mismatched verified identity cannot supply another account membership list', async () => {
  let calls = 0;
  const request = (async () => { calls++; return { verify: { _id: 'different-user' } }; }) as ApiRequest;
  await assert.rejects(fetchMemberships(request, undefined, 'user'), /does not match/);
  assert.equal(calls, 1);
});

test('cancellation between verification and accounts prevents the second request', async () => {
  const controller = new AbortController(); let calls = 0;
  const request = (async (_query, _variables, signal) => { assert.equal(signal, controller.signal); calls++; controller.abort(); return { verify: { _id: 'user' } }; }) as ApiRequest;
  await assert.rejects(fetchMemberships(request, controller.signal, 'user'), { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('a missing membership response is an error, not an empty Other organizations list', async () => {
  await assert.rejects(fetchMemberships((async () => ({ accounts: null })) as ApiRequest), /did not return/);
});
