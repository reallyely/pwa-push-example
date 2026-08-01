import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeGetNotification } from './get-notification.ts';
import { Notification } from '#notification-delivery/domain/notification.ts';
import type { NotificationRepository } from './ports.ts';

function fakeRepository(notification: Notification | null): NotificationRepository {
  return {
    async findById() { return notification; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
    async claimDueNotifications() { throw new Error('not used in this test'); },
  };
}

function scheduledNotification(overrides = {}) {
  return Notification.schedule({
    id: 'n1',
    recipientId: 'alice',
    title: 'Hello',
    description: 'World',
    scheduledDateTime: new Date(Date.now() + 60_000),
    ...overrides,
  });
}

describe('getNotification', () => {
  test('returns the notification when found', async () => {
    const notification = scheduledNotification();
    const getNotification = makeGetNotification({ notificationRepository: fakeRepository(notification) });

    const result = await getNotification({ notificationId: 'n1' });

    assert.equal(result, notification);
  });

  test('throws NOT_FOUND when no notification has that id', async () => {
    const getNotification = makeGetNotification({ notificationRepository: fakeRepository(null) });

    await assert.rejects(
      () => getNotification({ notificationId: 'missing' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });
});
