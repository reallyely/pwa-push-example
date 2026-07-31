import type { NotificationRepository } from './ports.ts';

interface DeliverResult {
  status: string;
  reason?: string | null;
}

interface Deps {
  notificationRepository: NotificationRepository;
  deliverNotification: (request: { notificationId: string }) => Promise<DeliverResult>;
  now?: () => Date;
}

interface RunDueNotificationsResponse {
  checked: number;
  sent: number;
}

function makeRunDueNotifications({ notificationRepository, deliverNotification, now = () => new Date() }: Deps) {
  return async function runDueNotifications(): Promise<RunDueNotificationsResponse> {
    const due = await notificationRepository.claimDueNotifications(now());
    let sent = 0;
    for (const notification of due) {
      const result = await deliverNotification({ notificationId: notification.id });
      if (result.status === 'Sent') sent += 1;
    }
    return { checked: due.length, sent };
  };
}

module.exports = { makeRunDueNotifications };
