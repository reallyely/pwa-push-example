import type { Observable } from 'rxjs';
import type { PushSubscriptionJSON } from 'domain/notification-delivery';

export type NotificationWireStatus = 'pending' | 'sent' | 'canceled' | 'expired' | 'failed';

export interface NotificationView {
  id: string;
  username: string;
  title: string;
  body: string;
  icon?: string;
  sendAt: string;
  sentAt: string | null;
  status: NotificationWireStatus;
}

export interface RecipientView {
  username: string;
  subscribed: boolean;
}

export interface SendNotificationRequest {
  username: string;
  title?: string;
  body?: string;
  icon?: string;
}

export interface ScheduleNotificationRequest extends SendNotificationRequest {
  sendAt: string;
}

export abstract class RecipientGateway {
  abstract vapidPublicKey(): Observable<string>;
  abstract subscribe(subscription: PushSubscriptionJSON): Observable<void>;
  abstract resubscribe(oldEndpoint: string, subscription: PushSubscriptionJSON): Observable<void>;
  abstract listUsers(): Observable<RecipientView[]>;
}

export abstract class NotificationGateway {
  abstract get(id: string): Observable<NotificationView>;
  abstract send(request: SendNotificationRequest): Observable<void>;
  abstract schedule(request: ScheduleNotificationRequest): Observable<NotificationView>;
  abstract cancel(id: string): Observable<void>;
  abstract list(): Observable<NotificationView[]>;
  abstract listScheduled(): Observable<NotificationView[]>;
}

export abstract class PushSubscriptionPort {
  abstract registerServiceWorker(): Observable<void>;
  abstract permission(): NotificationPermission;
  abstract requestPermission(): Observable<NotificationPermission>;
  abstract subscribe(vapidPublicKey: string): Observable<PushSubscriptionJSON>;
  abstract isStandalone(): boolean;
  abstract isIOS(): boolean;
}
