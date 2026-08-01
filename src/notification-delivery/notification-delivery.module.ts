import { Module } from '@nestjs/common';
import {
  RECIPIENT_REPOSITORY,
  NOTIFICATION_REPOSITORY,
  PUSH_GATEWAY,
  GENERATE_ID,
  type RecipientRepository,
  type NotificationRepository,
  type PushGateway,
} from './application/ports.js';
import { SqliteRecipientRepository } from './infrastructure/sqlite-recipient-repository.js';
import { SqliteNotificationRepository } from './infrastructure/sqlite-notification-repository.js';
import { WebPushGateway } from './infrastructure/web-push-gateway.js';
import { RegisterRecipient } from './application/register-recipient.js';
import { SubscribeRecipient } from './application/subscribe-recipient.js';
import { ResubscribeRecipient } from './application/resubscribe-recipient.js';
import { ListRecipients } from './application/list-recipients.js';
import { ScheduleNotification } from './application/schedule-notification.js';
import { CancelScheduledNotification } from './application/cancel-scheduled-notification.js';
import { GetNotification } from './application/get-notification.js';
import { DeliverNotification } from './application/deliver-notification.js';
import { RunDueNotifications } from './application/run-due-notifications.js';
import { ListNotifications } from './application/list-notifications.js';
import { RecipientsController } from './interface/recipients.controller.js';
import { NotificationsController } from './interface/notifications.controller.js';
import { NotificationScheduler } from './interface/notification-scheduler.js';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Module({
  controllers: [RecipientsController, NotificationsController],
  providers: [
    { provide: RECIPIENT_REPOSITORY, useClass: SqliteRecipientRepository },
    { provide: NOTIFICATION_REPOSITORY, useClass: SqliteNotificationRepository },
    { provide: PUSH_GATEWAY, useClass: WebPushGateway },
    { provide: GENERATE_ID, useValue: generateId },

    {
      provide: RegisterRecipient,
      useFactory: (recipientRepository: RecipientRepository) => new RegisterRecipient(recipientRepository),
      inject: [RECIPIENT_REPOSITORY],
    },
    {
      provide: SubscribeRecipient,
      useFactory: (recipientRepository: RecipientRepository) => new SubscribeRecipient(recipientRepository),
      inject: [RECIPIENT_REPOSITORY],
    },
    {
      provide: ResubscribeRecipient,
      useFactory: (recipientRepository: RecipientRepository) => new ResubscribeRecipient(recipientRepository),
      inject: [RECIPIENT_REPOSITORY],
    },
    {
      provide: ListRecipients,
      useFactory: (recipientRepository: RecipientRepository) => new ListRecipients(recipientRepository),
      inject: [RECIPIENT_REPOSITORY],
    },
    {
      provide: ScheduleNotification,
      useFactory: (
        recipientRepository: RecipientRepository,
        notificationRepository: NotificationRepository,
        generateIdFn: () => string,
      ) => new ScheduleNotification(recipientRepository, notificationRepository, generateIdFn),
      inject: [RECIPIENT_REPOSITORY, NOTIFICATION_REPOSITORY, GENERATE_ID],
    },
    {
      provide: CancelScheduledNotification,
      useFactory: (notificationRepository: NotificationRepository) => new CancelScheduledNotification(notificationRepository),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: GetNotification,
      useFactory: (notificationRepository: NotificationRepository) => new GetNotification(notificationRepository),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: DeliverNotification,
      useFactory: (
        notificationRepository: NotificationRepository,
        recipientRepository: RecipientRepository,
        pushGateway: PushGateway,
      ) => new DeliverNotification(notificationRepository, recipientRepository, pushGateway),
      inject: [NOTIFICATION_REPOSITORY, RECIPIENT_REPOSITORY, PUSH_GATEWAY],
    },
    {
      provide: RunDueNotifications,
      useFactory: (notificationRepository: NotificationRepository, deliverNotification: DeliverNotification) =>
        new RunDueNotifications(notificationRepository, deliverNotification),
      inject: [NOTIFICATION_REPOSITORY, DeliverNotification],
    },
    {
      provide: ListNotifications,
      useFactory: (notificationRepository: NotificationRepository) => new ListNotifications(notificationRepository),
      inject: [NOTIFICATION_REPOSITORY],
    },

    NotificationScheduler,
  ],
})
export class NotificationDeliveryModule {}
