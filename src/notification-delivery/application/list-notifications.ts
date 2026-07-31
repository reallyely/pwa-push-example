import { STATUSES } from '#notification-delivery/domain/notification-status.ts';
import type { NotificationRepository } from './ports.ts';
import type { Notification } from '#notification-delivery/domain/notification.ts';

interface Deps {
  notificationRepository: NotificationRepository;
}

interface ListNotificationsRequest {
  view: 'scheduled' | 'history';
}

export function makeListNotifications({ notificationRepository }: Deps) {
  return async function listNotifications({ view }: ListNotificationsRequest): Promise<Notification[]> {
    const all = await notificationRepository.findAll();
    if (view === 'scheduled') {
      return all
        .filter((n) => n.status === STATUSES.SCHEDULED)
        .sort((a, b) => a.scheduledDateTime.getTime() - b.scheduledDateTime.getTime());
    }
    return all
      .filter((n) => n.status !== STATUSES.SCHEDULED)
      .sort((a, b) => {
        const aTime = (a.sentDateTime || a.scheduledDateTime).getTime();
        const bTime = (b.sentDateTime || b.scheduledDateTime).getTime();
        return bTime - aTime;
      });
  };
}
