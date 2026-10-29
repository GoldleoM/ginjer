import { API_URL } from '../config/env';
export async function graphql<T>(query: string, variables: Record<string, unknown>, token?: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(API_URL, { method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { authorization: token } : {}) },
      body: JSON.stringify({ query, variables }) });
    if (!response.ok) throw new Error('The service is unavailable. Please try again.');
    const result = await response.json();
    if (result.errors?.length || !result.data) throw new Error('Unable to complete the request. Check your details and try again.');
    return result.data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
    if (error instanceof TypeError) throw new Error('Unable to connect. Check your internet connection.');
    throw error;
  } finally { clearTimeout(timeout); }
}
