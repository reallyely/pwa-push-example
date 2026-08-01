import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GetNotification } from './get-notification.js';
import { Notification } from '#notification-delivery/domain/notification.js';
import type { NotificationRepository } from './ports.js';

function fakeRepository(notification: Notification | null): NotificationRepository {
  return {
    async findByUsername() { throw new Error('not used in this test'); },
    async findByEndpoint() { throw new Error('not used in this test'); },
    async findById() { return notification; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
    async claimDueNotifications() { throw new Error('not used in this test'); },
  } as unknown as NotificationRepository;
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

describe('GetNotification', () => {
  test('returns the notification when found', async () => {
    const notification = scheduledNotification();
    const getNotification = new GetNotification(fakeRepository(notification));

    const result = await getNotification.execute({ notificationId: 'n1' });

    assert.equal(result, notification);
  });

  test('throws NOT_FOUND when no notification has that id', async () => {
    const getNotification = new GetNotification(fakeRepository(null));

    await assert.rejects(
      () => getNotification.execute({ notificationId: 'missing' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });
});
