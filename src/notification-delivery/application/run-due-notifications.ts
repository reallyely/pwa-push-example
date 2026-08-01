import type { NotificationRepository } from './ports.js';
import type { DeliverNotification } from './deliver-notification.js';

interface RunDueNotificationsResponse {
  checked: number;
  sent: number;
}

export class RunDueNotifications {
  constructor(
    private notificationRepository: NotificationRepository,
    private deliverNotification: DeliverNotification,
    private now: () => Date = () => new Date(),
  ) {}

  async execute(): Promise<RunDueNotificationsResponse> {
    const due = await this.notificationRepository.claimDueNotifications(this.now());
    let sent = 0;
    for (const notification of due) {
      const result = await this.deliverNotification.execute({ notificationId: notification.id });
      if (result.status === 'Sent') sent += 1;
    }
    return { checked: due.length, sent };
  }
}
