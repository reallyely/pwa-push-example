import { Body, Controller, Get, HttpCode, Post, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegisterRecipient } from '#notification-delivery/application/register-recipient.js';
import { SubscribeRecipient } from '#notification-delivery/application/subscribe-recipient.js';
import { ResubscribeRecipient } from '#notification-delivery/application/resubscribe-recipient.js';
import { ListRecipients, type RecipientView } from '#notification-delivery/application/list-recipients.js';
import type { PushSubscriptionJSON } from '#notification-delivery/domain/recipient.js';
import { NotificationDeliveryExceptionFilter } from './notification-delivery-exception.filter.js';

@Controller('api')
@UseFilters(NotificationDeliveryExceptionFilter)
export class RecipientsController {
  constructor(
    private configService: ConfigService,
    private registerRecipient: RegisterRecipient,
    private subscribeRecipient: SubscribeRecipient,
    private resubscribeRecipient: ResubscribeRecipient,
    private listRecipients: ListRecipients,
  ) {}

  @Get('vapid-public-key')
  vapidPublicKey(): { publicKey: string } {
    return { publicKey: this.configService.getOrThrow('VAPID_PUBLIC_KEY') };
  }

  @Post('register')
  @HttpCode(201)
  register(@Body() body: { username: string }): Promise<{ username: string }> {
    return this.registerRecipient.execute({ username: body?.username });
  }

  @Post('subscribe')
  @HttpCode(204)
  subscribe(@Body() body: { username: string; subscription: PushSubscriptionJSON }): Promise<void> {
    return this.subscribeRecipient.execute({ username: body?.username, subscription: body?.subscription });
  }

  @Post('resubscribe')
  @HttpCode(204)
  resubscribe(@Body() body: { oldEndpoint: string; subscription: PushSubscriptionJSON }): Promise<void> {
    return this.resubscribeRecipient.execute({ oldEndpoint: body?.oldEndpoint, subscription: body?.subscription });
  }

  @Get('users')
  users(): Promise<RecipientView[]> {
    return this.listRecipients.execute();
  }
}
