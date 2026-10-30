import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfile, validateProfile } from '../src/features/profile/services/validation.ts';
import type { Profile } from '../src/features/profile/types.ts';

const valid: Profile = {
  id: 'test-profile', firstName: 'Shaheen', lastName: 'Ansari', email: 'shaheen@example.com',
  primaryPhone: '+91 98765 43210', secondaryPhone: '', organizationId: 'senra', projectId: null, avatarStyle: 'default',
};
test('accepts international phone formatting and an optional secondary phone', () => {
  for (const primaryPhone of ['987654857', '+91 98765 43210', '+1 (212) 555-0123']) {
    assert.deepEqual(validateProfile({ ...valid, primaryPhone }), {});
  }
});
test('requires both names and a valid email', () => {
  const errors = validateProfile({ ...valid, firstName: '  ', lastName: '', email: 'a b@example.com' });
  assert.ok(errors.firstName);
  assert.ok(errors.lastName);
  assert.ok(errors.email);
  assert.equal(errors.primaryPhone, undefined);
});
test('rejects invalid phone lengths, letters, and misplaced plus signs', () => {
  for (const primaryPhone of ['', '123456', '1234567890123456', '98765abc43210', '91+9876543210']) {
    assert.ok(validateProfile({ ...valid, primaryPhone }).primaryPhone, primaryPhone);
  }
  assert.ok(validateProfile({ ...valid, secondaryPhone: 'abc' }).secondaryPhone);
});
test('normalizes editable text without mutating profile identity or selection', () => {
  const input = { ...valid, firstName: ' Shaheen ', lastName: ' Ansari ', email: ' shaheen@example.com ', primaryPhone: ' +91 98765 43210 ', secondaryPhone: ' ' };
  assert.deepEqual(normalizeProfile(input), valid);
  assert.equal(input.firstName, ' Shaheen ');
});
