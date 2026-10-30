import { saveSession, clearToken } from '../../../services/session';
import { graphql } from '../../../services/graphql';
import type { AuthUser } from '../types';
const SIGN_IN = 'query SignIn($auth: SignInInput!) { signIn(auth: $auth) { _id firstName lastName emailId token defaultAccount organisationId } }';
export async function signIn(emailId: string, password: string): Promise<AuthUser> {
  const { signIn: user } = await graphql<{ signIn: AuthUser | null }>(SIGN_IN, { auth: { emailId: emailId.trim(), password, application: 'Ginjer', forever: true } });
  if (!user?.token || !user._id) throw new Error('Sign-in failed. Check your email and password.');
  await saveSession(user);
  return user;
}
export async function signOut() { await clearToken(); }
