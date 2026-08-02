import { STATUSES, type Notification } from 'domain/notification-delivery';
import type { NotificationRepository } from './ports.js';

interface ListNotificationsRequest {
  view: 'scheduled' | 'history';
}

export class ListNotifications {
  constructor(private notificationRepository: NotificationRepository) {}

  async execute({ view }: ListNotificationsRequest): Promise<Notification[]> {
    const all = await this.notificationRepository.findAll();
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
  }
}
