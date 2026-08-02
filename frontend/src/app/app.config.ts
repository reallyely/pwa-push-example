import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthGateway } from './identity/application/ports';
import { AuthStore } from './identity/application/auth.store';
import { HttpAuthGateway } from './identity/infrastructure/http-auth-gateway';
import { RecipientGateway, NotificationGateway, PushSubscriptionPort } from './notification-delivery/application/ports';
import { EnablePushNotifications } from './notification-delivery/application/enable-push-notifications';
import { AdminNotificationsStore } from './notification-delivery/application/admin-notifications.store';
import { HttpRecipientGateway } from './notification-delivery/infrastructure/http-recipient-gateway';
import { HttpNotificationGateway } from './notification-delivery/infrastructure/http-notification-gateway';
import { BrowserPushGateway } from './notification-delivery/infrastructure/browser-push-gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),

    { provide: AuthGateway, useClass: HttpAuthGateway },
    { provide: AuthStore, useFactory: () => new AuthStore(inject(AuthGateway)) },

    { provide: RecipientGateway, useClass: HttpRecipientGateway },
    { provide: NotificationGateway, useClass: HttpNotificationGateway },
    { provide: PushSubscriptionPort, useClass: BrowserPushGateway },
    {
      provide: EnablePushNotifications,
      useFactory: () => new EnablePushNotifications(inject(PushSubscriptionPort), inject(RecipientGateway)),
    },
    {
      provide: AdminNotificationsStore,
      useFactory: () => new AdminNotificationsStore(inject(NotificationGateway)),
    },
  ],
};
