import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCredentials } from '../src/features/auth/services/validation.ts';
test('rejects empty or malformed email', () => { for (const email of ['', 'abc', 'a@b', 'a b@example.com']) assert.ok(validateCredentials(email, 'secret')); });
test('rejects empty passwords', () => assert.equal(validateCredentials('a@example.com', ''), 'Enter your password.'));
test('accepts valid credentials with trimmed email', () => assert.equal(validateCredentials(' a@example.com ', 'secret'), null));
