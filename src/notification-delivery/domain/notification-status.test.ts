import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { STATUSES, ALL, isValid } from './notification-status.ts';

describe('notification-status', () => {
  test('ALL contains exactly the known statuses', () => {
    assert.deepEqual([...ALL].sort(), Object.values(STATUSES).sort());
  });

  test('isValid accepts every known status', () => {
    for (const status of ALL) {
      assert.equal(isValid(status), true);
    }
  });

  test('isValid rejects an unknown status', () => {
    assert.equal(isValid('Pending'), false);
  });
});
