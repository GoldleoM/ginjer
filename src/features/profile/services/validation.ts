import type { Profile, ProfileErrors } from '../types';

export function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    firstName: profile.firstName.trim(),
    lastName: profile.lastName.trim(),
    email: profile.email.trim(),
    primaryPhone: profile.primaryPhone.trim(),
    secondaryPhone: profile.secondaryPhone.trim(),
  };
}
export function validateProfile(profile: Profile): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!profile.firstName.trim()) errors.firstName = 'Enter your first name.';
  if (!profile.lastName.trim()) errors.lastName = 'Enter your last name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) errors.email = 'Enter a valid email address.';
  // Allow international formatting; do not assume one country's phone length.
  const validPhone = (value: string) => /^\+?[\d\s().-]+$/.test(value.trim()) && /^\d{7,15}$/.test(value.replace(/\D/g, ''));
  if (!validPhone(profile.primaryPhone)) errors.primaryPhone = 'Enter a valid primary phone number.';
  if (profile.secondaryPhone.trim() && !validPhone(profile.secondaryPhone)) errors.secondaryPhone = 'Enter a valid secondary phone number.';
  return errors;
}
