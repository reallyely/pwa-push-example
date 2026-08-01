import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, ALL, isValid } from './role.js';

describe('ROLES', () => {
  test('contains the closed set of roles', () => {
    assert.deepEqual(ROLES, { PARTICIPANT: 'Participant', RESEARCHER: 'Researcher', TRAINER: 'Trainer' });
  });

  test('ALL lists every role', () => {
    assert.deepEqual(ALL, ['Participant', 'Researcher', 'Trainer']);
  });
});

describe('isValid', () => {
  test('accepts known roles', () => {
    assert.equal(isValid('Participant'), true);
    assert.equal(isValid('Researcher'), true);
    assert.equal(isValid('Trainer'), true);
  });

  test('rejects unknown roles', () => {
    assert.equal(isValid('Admin'), false);
    assert.equal(isValid(''), false);
  });
});
