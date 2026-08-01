import { Body, Controller, Get, HttpCode, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { SubscribeRecipient } from '#notification-delivery/application/subscribe-recipient.js';
import { ResubscribeRecipient } from '#notification-delivery/application/resubscribe-recipient.js';
import { ListRecipients, type RecipientView } from '#notification-delivery/application/list-recipients.js';
import type { PushSubscriptionJSON } from '#notification-delivery/domain/recipient.js';
import { SessionAuthGuard } from '#identity/interface/session-auth.guard.js';
import { RolesGuard } from '#identity/interface/roles.guard.js';
import { Roles } from '#identity/interface/roles.decorator.js';
import { NotificationDeliveryExceptionFilter } from './notification-delivery-exception.filter.js';

@Controller('api')
@UseFilters(NotificationDeliveryExceptionFilter)
export class RecipientsController {
  constructor(
    private configService: ConfigService,
    private subscribeRecipient: SubscribeRecipient,
    private resubscribeRecipient: ResubscribeRecipient,
    private listRecipients: ListRecipients,
  ) {}

  @Get('vapid-public-key')
  vapidPublicKey(): { publicKey: string } {
    return { publicKey: this.configService.getOrThrow('VAPID_PUBLIC_KEY') };
  }

  @Post('subscribe')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  subscribe(@Req() req: Request, @Body() body: { subscription: PushSubscriptionJSON }): Promise<void> {
    return this.subscribeRecipient.execute({ username: (req as any).user.id, subscription: body?.subscription });
  }

  @Post('resubscribe')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  resubscribe(@Req() req: Request, @Body() body: { oldEndpoint: string; subscription: PushSubscriptionJSON }): Promise<void> {
    return this.resubscribeRecipient.execute({ oldEndpoint: body?.oldEndpoint, subscription: body?.subscription });
  }

  @Get('users')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('Researcher', 'Trainer')
  users(): Promise<RecipientView[]> {
    return this.listRecipients.execute();
  }
}
