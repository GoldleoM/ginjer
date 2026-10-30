import { API_URL } from '../config/env';
import { expireSession, getSessionVersion, getToken, saveToken } from './session';
import { createGraphqlTransport } from './graphqlTransport';
export { ApiError } from './graphqlTransport';

const transport = createGraphqlTransport({ url: API_URL, getToken, saveToken, onExpired: expireSession, getSessionVersion });
export function graphql<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  return transport<T>(query, variables, signal, false);
}
export function authenticatedGraphql<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  return transport<T>(query, variables, signal, true);
}
