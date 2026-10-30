export class ApiError extends Error {
  code: 'auth' | 'permission' | 'network' | 'timeout' | 'server' | 'request';
  constructor(message: string, code: 'auth' | 'permission' | 'network' | 'timeout' | 'server' | 'request') {
    super(message); this.name = 'ApiError'; this.code = code;
  }
}
type Dependencies = {
  url: string;
  fetcher?: typeof fetch;
  getToken: () => Promise<string | null>;
  saveToken: (token: string) => Promise<void>;
  onExpired: () => Promise<void>;
  timeoutMs?: number;
  getSessionVersion?: () => number;
};
export type ApiRequest = <T>(query: string, variables?: Record<string, unknown>, signal?: AbortSignal) => Promise<T>;

export function createGraphqlTransport(deps: Dependencies) {
  return async function request<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal, authenticated = true): Promise<T> {
    const version = deps.getSessionVersion?.() ?? 0;
    const isCurrent = () => (deps.getSessionVersion?.() ?? 0) === version;
    const cancelled = () => { const error = new Error('Request cancelled'); error.name = 'AbortError'; return error; };
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort);
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, deps.timeoutMs ?? 20000);
    try {
      const token = authenticated ? await deps.getToken() : null;
      if (authenticated && !isCurrent()) throw cancelled();
      if (authenticated && !token) { await deps.onExpired(); throw new ApiError('Your session has expired. Please sign in again.', 'auth'); }
      const response = await (deps.fetcher ?? fetch)(deps.url, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: token } : {}) },
        body: JSON.stringify({ query, variables }),
      });
      if (response.status === 401) {
        if (authenticated && isCurrent()) await deps.onExpired();
        throw new ApiError(authenticated ? 'Your session has expired. Please sign in again.' : 'Check your email and password.', 'auth');
      }
      if (response.status === 403) throw new ApiError('You do not have permission to view this information.', 'permission');
      if (!response.ok) throw new ApiError('The service is unavailable. Please try again.', 'server');
      let result: { data?: Record<string, unknown>; errors?: { message?: string; extensions?: { code?: string } }[] };
      try { result = await response.json(); } catch { throw new ApiError('The service returned an unreadable response. Please try again.', 'server'); }
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw new ApiError('The service returned an unreadable response. Please try again.', 'server');
      if (Array.isArray(result.errors) && result.errors.length) {
        const authFailure = result.errors.some(error => /UNAUTHENTICATED|TOKEN_EXPIRED|INVALID_TOKEN/i.test(error.extensions?.code ?? '')
          || /jwt expired|invalid (?:user )?token|token expired|not authenticated|unauthenticated|unauthori[sz]ed/i.test(error.message ?? ''));
        if (authFailure && authenticated && isCurrent()) await deps.onExpired();
        if (!authFailure && result.errors.some(error => /FORBIDDEN|PERMISSION_DENIED|ACCESS_DENIED/i.test(error.extensions?.code ?? ''))) throw new ApiError('You do not have permission to view this information.', 'permission');
        throw new ApiError(authFailure ? (authenticated ? 'Your session has expired. Please sign in again.' : 'Check your email and password.')
          : 'Unable to complete this request. Please try again.', authFailure ? 'auth' : 'request');
      }
      if (!result.data || typeof result.data !== 'object') throw new ApiError('The service returned no data. Please try again.', 'server');
      // Ginjer includes a rotated session token alongside requested data.
      if (authenticated && typeof result.data.token === 'string' && result.data.token) {
        // A request finishing after sign-out must not restore the old session.
        if (isCurrent() && await deps.getToken() && isCurrent()) await deps.saveToken(result.data.token);
      }
      if (authenticated && !isCurrent()) throw cancelled();
      return result.data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (controller.signal.aborted) {
        if (signal?.aborted) throw cancelled();
        throw new ApiError(timedOut ? 'The request timed out. Please try again.' : 'Request cancelled.', 'timeout');
      }
      if (error instanceof TypeError) throw new ApiError('Unable to connect. Check your internet connection.', 'network');
      throw error;
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  };
}
