import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../features/auth/types';
const TOKEN_KEY = 'ginjer.session.token';
const USER_KEY = 'ginjer.session.user';
let browserToken: string | null = null;
let browserUser: Omit<AuthUser, 'token'> | null = null;
let sessionVersion = 0;
let pending: Promise<unknown> = Promise.resolve();
const expiredListeners = new Set<() => void>();
function enqueue(operation: () => Promise<void>) {
  const next = pending.then(operation, operation); pending = next.catch(() => {}); return next;
}
export function getSessionVersion() { return sessionVersion; }
export async function saveToken(token: string): Promise<void> {
  const version = sessionVersion;
  await enqueue(async () => {
    if (version !== sessionVersion) return;
    if (Platform.OS === 'web') browserToken = token;
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
  });
}
export async function getToken(): Promise<string | null> {
  await pending;
  return Platform.OS === 'web' ? browserToken : SecureStore.getItemAsync(TOKEN_KEY);
}
export async function saveSession(user: AuthUser) {
  const version = ++sessionVersion;
  const { token, ...identity } = user;
  await enqueue(async () => {
    if (version !== sessionVersion) return;
    if (Platform.OS === 'web') { browserToken = token; browserUser = identity; return; }
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(identity));
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  });
}
export async function restoreSession(): Promise<AuthUser | null> {
  const token = await getToken();
  const raw = Platform.OS === 'web' ? browserUser : await SecureStore.getItemAsync(USER_KEY);
  if (!token || !raw) return null;
  try {
    const identity = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!identity || typeof identity._id !== 'string' || typeof identity.emailId !== 'string') return null;
    return { ...identity, token };
  } catch { return null; }
}
export async function clearToken(): Promise<void> {
  ++sessionVersion; browserToken = null; browserUser = null;
  await enqueue(async () => {
    if (Platform.OS !== 'web') await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
  });
}
export async function expireSession() {
  try { await clearToken(); } finally { expiredListeners.forEach(listener => listener()); }
}
export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener); return () => { expiredListeners.delete(listener); };
}
