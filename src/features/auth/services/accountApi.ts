import type { ApiRequest } from '../../../services/graphqlTransport';
export interface Registration { firstName: string; lastName: string; emailId: string; password: string; confirmation: string; }
export interface AccountIdentity { _id: string; firstName: string; lastName: string; emailId: string; }
export function registrationInput(value: Registration) {
  const firstName = value.firstName.trim(), lastName = value.lastName.trim(), emailId = value.emailId.trim();
  if (!firstName || !lastName) throw new Error('Enter your first and last name.');
  if (firstName.length > 80 || lastName.length > 80) throw new Error('Names must be 80 characters or fewer.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId)) throw new Error('Enter a valid email address.');
  if (value.password.length < 8) throw new Error('Use a password with at least 8 characters.');
  if (value.password !== value.confirmation) throw new Error('The passwords do not match.');
  return { firstName, lastName, emailId, password: value.password, application: 'Ginjer' };
}
export function profileInput(id: string, firstName: string, lastName: string) {
  if (!id) throw new Error('Sign in again to update your profile.');
  if (!firstName.trim() || !lastName.trim()) throw new Error('Enter your first and last name.');
  if (firstName.trim().length > 80 || lastName.trim().length > 80) throw new Error('Names must be 80 characters or fewer.');
  return { _id: id, firstName: firstName.trim(), lastName: lastName.trim() };
}
export const SIGN_UP_MUTATION = 'mutation Register($user: SignUpInput!) { signUp(user: $user) { _id emailId verified } }';
export const UPDATE_PROFILE_MUTATION = 'mutation UpdateMyProfile($editUserInput: EditUserInput!) { updateUserProfile(editUserInput: $editUserInput) { _id firstName lastName emailId } }';
export function createAccountApi(publicRequest: ApiRequest, authenticatedRequest: ApiRequest) {
  return {
    async register(value: Registration) {
      const data = await publicRequest<{ signUp: { _id?: string; emailId?: string; verified?: string } | null }>(SIGN_UP_MUTATION, { user: registrationInput(value) });
      if (!data.signUp?._id) throw new Error('The server did not confirm account creation. Check your email before trying again.');
      return { email: data.signUp.emailId || value.emailId.trim() };
    },
    async update(id: string, firstName: string, lastName: string): Promise<AccountIdentity> {
      const data = await authenticatedRequest<{ updateUserProfile: AccountIdentity | null }>(UPDATE_PROFILE_MUTATION, { editUserInput: profileInput(id, firstName, lastName) });
      if (data.updateUserProfile?._id !== id || !data.updateUserProfile.firstName || !data.updateUserProfile.lastName || !data.updateUserProfile.emailId) throw new Error('The server did not return your updated profile.');
      const { _id, firstName: savedFirstName, lastName: savedLastName, emailId } = data.updateUserProfile;
      return { _id, firstName: savedFirstName, lastName: savedLastName, emailId };
    },
  };
}
