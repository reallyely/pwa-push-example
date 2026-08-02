import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Notification } from './notification.ts';
import { STATUSES } from './notification-status.ts';

const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 60_000);

function validSchedule(overrides = {}) {
  return {
    id: 'n1',
    recipientId: 'alice',
    title: 'Hello',
    description: 'World',
    scheduledDateTime: future(),
    ...overrides,
  };
}

describe('Notification.schedule', () => {
  test('requires a recipientId', () => {
    assert.throws(() => Notification.schedule(validSchedule({ recipientId: '' })));
  });

  test('requires a title', () => {
    assert.throws(() => Notification.schedule(validSchedule({ title: '' })));
  });

  test('requires a valid scheduledDateTime', () => {
    assert.throws(() => Notification.schedule(validSchedule({ scheduledDateTime: new Date('not-a-date') })));
  });

  test('rejects a scheduledDateTime in the past', () => {
    assert.throws(
      () => Notification.schedule(validSchedule({ scheduledDateTime: past() })),
      (err: any) => err.code === 'INVALID_SCHEDULE',
    );
  });

  test('starts as Scheduled with no sentDateTime/failureReason', () => {
    const notification = Notification.schedule(validSchedule());
    assert.equal(notification.status, STATUSES.SCHEDULED);
    assert.equal(notification.sentDateTime, null);
    assert.equal(notification.failureReason, null);
  });
});

describe('Notification#markSent', () => {
  test('transitions a Scheduled notification to Sent', () => {
    const notification = Notification.schedule(validSchedule());
    const sentAt = new Date();
    notification.markSent(sentAt);
    assert.equal(notification.status, STATUSES.SENT);
    assert.equal(notification.sentDateTime, sentAt);
  });

  test('cannot mark a non-Scheduled notification as sent', () => {
    const notification = Notification.schedule(validSchedule());
    notification.cancel();
    assert.throws(
      () => notification.markSent(new Date()),
      (err: any) => err.code === 'INVALID_TRANSITION',
    );
  });
});

describe('Notification#markFailed', () => {
  test('transitions a Scheduled notification to Failed with a reason', () => {
    const notification = Notification.schedule(validSchedule());
    notification.markFailed('subscription-expired');
    assert.equal(notification.status, STATUSES.FAILED);
    assert.equal(notification.failureReason, 'subscription-expired');
  });

  test('cannot mark a non-Scheduled notification as failed', () => {
    const notification = Notification.schedule(validSchedule());
    notification.markSent(new Date());
    assert.throws(
      () => notification.markFailed('too late'),
      (err: any) => err.code === 'INVALID_TRANSITION',
    );
  });
});

describe('Notification#cancel', () => {
  test('transitions a Scheduled notification to Cancelled', () => {
    const notification = Notification.schedule(validSchedule());
    notification.cancel();
    assert.equal(notification.status, STATUSES.CANCELLED);
  });

  test('cannot cancel a notification that already Sent', () => {
    const notification = Notification.schedule(validSchedule());
    notification.markSent(new Date());
    assert.throws(
      () => notification.cancel(),
      (err: any) => err.code === 'INVALID_TRANSITION',
    );
  });
});

describe('Notification#isDue', () => {
  test('is due when Scheduled and scheduledDateTime has passed', () => {
    const notification = new Notification({ ...validSchedule(), scheduledDateTime: past(), status: STATUSES.SCHEDULED });
    assert.equal(notification.isDue(), true);
  });

  test('is not due while scheduledDateTime is in the future', () => {
    const notification = Notification.schedule(validSchedule());
    assert.equal(notification.isDue(), false);
  });

  test('is not due once no longer Scheduled, even if the time has passed', () => {
    const notification = new Notification({ ...validSchedule(), scheduledDateTime: past(), status: STATUSES.SENT });
    assert.equal(notification.isDue(), false);
  });
});
