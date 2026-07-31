import type { Notification } from '#notification-delivery/domain/notification.ts';
import type { DeliverNotificationResponse } from '#notification-delivery/application/deliver-notification.ts';

export interface NotificationView {
  id: string;
  username: string;
  title: string;
  body: string;
  icon?: string;
  sendAt: string;
  sentAt: string | null;
  status: string;
}

function toWireStatus(notification: Notification): string {
  switch (notification.status) {
    case 'Scheduled': return 'pending';
    case 'Sent': return 'sent';
    case 'Cancelled': return 'canceled';
    case 'Failed':
      return notification.failureReason === 'subscription-expired' ? 'expired' : 'failed';
    default: return notification.status;
  }
}

// Translates the domain shape (recipientId/description/scheduledDateTime/
// sentDateTime) into the wire shape public/admin/app.js already expects
// (username/body/sendAt/sentAt), so the frontend needs no changes.
export function toNotificationView(notification: Notification): NotificationView {
  return {
    id: notification.id,
    username: notification.recipientId,
    title: notification.title,
    body: notification.description,
    icon: notification.icon || undefined,
    sendAt: notification.scheduledDateTime.toISOString(),
    sentAt: notification.sentDateTime ? notification.sentDateTime.toISOString() : null,
    status: toWireStatus(notification),
  };
}

const SEND_FAILURE_RESPONSE_BY_REASON: Record<string, [number, string]> = {
  'no-active-subscription': [409, 'user has no active push subscription'],
  'subscription-expired': [410, 'subscription expired, ask user to re-register'],
};

export function toSendOutcome(result: DeliverNotificationResponse): { httpStatus: number; body: object } {
  if (result.status === 'Sent') {
    return { httpStatus: 200, body: { ok: true } };
  }
  const [httpStatus, message] = SEND_FAILURE_RESPONSE_BY_REASON[result.reason || ''] || [500, 'failed to send notification'];
  return { httpStatus, body: { error: message } };
}
