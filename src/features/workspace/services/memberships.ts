import type { ApiRequest } from '../../../services/graphqlTransport';

export const MEMBERSHIPS_QUERY = 'query OrgList { accounts { organisationId name isActive isAccepted isAdmin } }';
const VERIFY_SESSION = 'query VerifyMembershipSession($params: ParamInput!) { verify(params: $params) { _id } }';

export async function fetchMemberships(request: ApiRequest, signal?: AbortSignal, expectedUserId?: string): Promise<unknown> {
  // Match the website's session verification before querying Other organisations.
  // The transport persists the rotated top-level token before this promise resolves.
  if (expectedUserId) {
    const verified = await request<{ verify: { _id: string } | null }>(VERIFY_SESSION, { params: {} }, signal);
    if (verified.verify?._id !== expectedUserId) throw new Error('The server session does not match your signed-in account. Sign out and sign in again.');
  }
  if (signal?.aborted) { const error = new Error('Request cancelled'); error.name = 'AbortError'; throw error; }
  const data = await request<{ accounts: unknown }>(MEMBERSHIPS_QUERY, {}, signal);
  if (!Array.isArray(data.accounts)) throw new Error('The server did not return an organization list. Please refresh again.');
  return data.accounts;
}
