import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'ginjer.session.token';
let browserToken: string | null = null;

// Keep browser sessions in memory; native sessions use OS-backed secure storage.
export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') { browserToken = token; return; }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return Platform.OS === 'web' ? browserToken : SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') { browserToken = null; return; }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
