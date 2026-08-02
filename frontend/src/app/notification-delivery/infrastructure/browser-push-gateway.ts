import { Injectable } from '@angular/core';
import { from, type Observable } from 'rxjs';
import type { PushSubscriptionJSON } from 'domain/notification-delivery';
import { PushSubscriptionPort } from '../application/ports';
import { isIOS, isStandalone } from '../../infrastructure/browser-environment';
import { urlBase64ToUint8Array } from '../../infrastructure/url-base64';

@Injectable({ providedIn: 'root' })
export class BrowserPushGateway implements PushSubscriptionPort {
  registerServiceWorker(): Observable<void> {
    return from(
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => navigator.serviceWorker.ready)
        .then(() => undefined),
    );
  }

  permission(): NotificationPermission {
    return Notification.permission;
  }

  requestPermission(): Observable<NotificationPermission> {
    return from(Notification.requestPermission());
  }

  subscribe(vapidPublicKey: string): Observable<PushSubscriptionJSON> {
    return from(this.getOrCreateSubscription(vapidPublicKey));
  }

  isStandalone(): boolean {
    return isStandalone();
  }

  isIOS(): boolean {
    return isIOS();
  }

  private async getOrCreateSubscription(vapidPublicKey: string): Promise<PushSubscriptionJSON> {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }
    return toPushSubscriptionJSON(subscription);
  }
}

function toPushSubscriptionJSON(subscription: PushSubscription): PushSubscriptionJSON {
  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  if (!json.endpoint || !keys['p256dh'] || !keys['auth']) {
    throw new Error('push subscription is missing required fields');
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: keys['p256dh'], auth: keys['auth'] },
    expirationTime: json.expirationTime ?? null,
  };
}
