import { signal, type Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PushSubscriptionPort, RecipientGateway } from './ports';

export type EnablePushStatus =
  | 'idle'
  | 'unsupported'
  | 'needs-install'
  | 'requesting-permission'
  | 'subscribing'
  | 'enabled'
  | 'denied'
  | 'error';

export class EnablePushNotifications {
  private readonly _status = signal<EnablePushStatus>('idle');
  readonly status: Signal<EnablePushStatus> = this._status.asReadonly();

  private readonly _error = signal<string | null>(null);
  readonly error: Signal<string | null> = this._error.asReadonly();

  constructor(
    private readonly pushSubscriptionPort: PushSubscriptionPort,
    private readonly recipientGateway: RecipientGateway,
  ) {}

  async enable(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      this._status.set('unsupported');
      return;
    }

    if (this.pushSubscriptionPort.isIOS() && !this.pushSubscriptionPort.isStandalone()) {
      this._status.set('needs-install');
      return;
    }

    try {
      this._status.set('requesting-permission');
      const permission = await firstValueFrom(this.pushSubscriptionPort.requestPermission());
      if (permission !== 'granted') {
        this._status.set('denied');
        return;
      }

      await this.subscribe();
      this._status.set('enabled');
    } catch (err) {
      this._error.set(err instanceof Error ? err.message : 'Something went wrong.');
      this._status.set('error');
    }
  }

  // iOS never fires pushsubscriptionchange and subscriptions have been observed to
  // go stale with no event to react to, so re-verify on every app launch instead.
  async syncIfAlreadyPermitted(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (this.pushSubscriptionPort.permission() !== 'granted') return;

    try {
      await this.subscribe();
      this._status.set('enabled');
    } catch (err) {
      console.error('Silent resubscribe failed', err);
      this._status.set('idle');
    }
  }

  private async subscribe(): Promise<void> {
    this._status.set('subscribing');
    await firstValueFrom(this.pushSubscriptionPort.registerServiceWorker());
    const vapidPublicKey = await firstValueFrom(this.recipientGateway.vapidPublicKey());
    const subscription = await firstValueFrom(this.pushSubscriptionPort.subscribe(vapidPublicKey));
    await firstValueFrom(this.recipientGateway.subscribe(subscription));
  }
}
