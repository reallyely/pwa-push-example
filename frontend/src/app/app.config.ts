import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

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
import { QuestionGateway } from './training/application/ports';
import { QuestionsStore } from './training/application/questions.store';
import { HttpQuestionGateway } from './training/infrastructure/http-question-gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    providePrimeNG({
      theme: { preset: Aura },
      license:
        'eyJpZCI6IjA1YjUyNjNmLTUxOTQtNGQ3Ny1iZjIyLTNjMGY4NTk2ODIxNCIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODU2ODI1MjQsImV4cCI6MTgxNzIxODUyNH0.4q0mTaHvFCj_7QHCpSQ1w0a4gTuf8GX49MD2kmAuits4UHfcDQ17af1Gz6lJ0318piCFacY1yfVBCjG-oo1JBQ',
    }),

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

    { provide: QuestionGateway, useClass: HttpQuestionGateway },
    {
      provide: QuestionsStore,
      useFactory: () => new QuestionsStore(inject(QuestionGateway)),
    },
  ],
};
