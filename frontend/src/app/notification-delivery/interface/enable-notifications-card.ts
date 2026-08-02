import { Component, OnInit, computed, inject } from '@angular/core';
import { EnablePushNotifications } from '../application/enable-push-notifications';

@Component({
  selector: 'app-enable-notifications-card',
  templateUrl: './enable-notifications-card.html',
  styleUrl: './enable-notifications-card.css',
})
export class EnableNotificationsCard implements OnInit {
  private readonly useCase = inject(EnablePushNotifications);

  protected readonly status = this.useCase.status;

  protected readonly message = computed(() => {
    switch (this.status()) {
      case 'unsupported':
        return "This browser doesn't support push notifications.";
      case 'needs-install':
        return (
          'On iPhone/iPad, push only works once this is installed: tap Share → ' +
          '"Add to Home Screen", then open the app from that icon and log in again ' +
          'to finish enabling notifications.'
        );
      case 'requesting-permission':
        return 'Requesting notification permission...';
      case 'subscribing':
        return 'Subscribing to push...';
      case 'denied':
        return 'Notification permission was denied.';
      case 'enabled':
        return 'Notifications enabled — you can install this app now.';
      case 'error':
        return this.useCase.error() ?? 'Something went wrong enabling notifications.';
      default:
        return null;
    }
  });

  // Only these states are usefully retryable by a click.
  protected readonly canEnable = computed(() => {
    const status = this.status();
    return status === 'idle' || status === 'denied' || status === 'error';
  });

  ngOnInit(): void {
    void this.useCase.syncIfAlreadyPermitted();
  }

  enable(): void {
    void this.useCase.enable();
  }
}
