import { Body, Controller, Delete, ForbiddenException, Get, Headers, HttpCode, Param, Post, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ScheduleNotification } from '#notification-delivery/application/schedule-notification.js';
import { CancelScheduledNotification } from '#notification-delivery/application/cancel-scheduled-notification.js';
import { DeliverNotification } from '#notification-delivery/application/deliver-notification.js';
import { RunDueNotifications } from '#notification-delivery/application/run-due-notifications.js';
import { ListNotifications } from '#notification-delivery/application/list-notifications.js';
import { GetNotification } from '#notification-delivery/application/get-notification.js';
import { SessionAuthGuard } from '#identity/interface/session-auth.guard.js';
import { RolesGuard } from '#identity/interface/roles.guard.js';
import { Roles } from '#identity/interface/roles.decorator.js';
import { toNotificationView, toSendOutcome } from './notification-presenter.js';
import { NotificationDeliveryExceptionFilter } from './notification-delivery-exception.filter.js';

@Controller('api')
@UseFilters(NotificationDeliveryExceptionFilter)
export class NotificationsController {
  constructor(
    private configService: ConfigService,
    private scheduleNotification: ScheduleNotification,
    private cancelScheduledNotification: CancelScheduledNotification,
    private deliverNotification: DeliverNotification,
    private runDueNotifications: RunDueNotifications,
    private listNotifications: ListNotifications,
    private getNotification: GetNotification,
  ) {}

  @Post('send')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('Researcher', 'Trainer')
  async send(
    @Body() body: { username: string; title?: string; body?: string; icon?: string },
    @Res() res: Response,
  ): Promise<void> {
    const { notificationId } = await this.scheduleNotification.execute({
      recipientId: body?.username,
      title: body?.title || 'Demo notification',
      description: body?.body || '',
      scheduledDateTime: new Date(),
      icon: body?.icon,
    });
    const result = await this.deliverNotification.execute({ notificationId });
    const { httpStatus, body: responseBody } = toSendOutcome(result);
    res.status(httpStatus).json(responseBody);
  }

  @Get('notifications')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('Researcher', 'Trainer')
  async history() {
    const list = await this.listNotifications.execute({ view: 'history' });
    return list.map(toNotificationView);
  }

  @Get('notifications/:id')
  @UseGuards(SessionAuthGuard)
  async byId(@Param('id') id: string, @Req() req: Request) {
    const notification = await this.getNotification.execute({ notificationId: id });
    const user = (req as any).user;
    if (user.role !== 'Researcher' && user.role !== 'Trainer' && user.id !== notification.recipientId) {
      throw new ForbiddenException();
    }
    return toNotificationView(notification);
  }

  @Post('schedule')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('Researcher', 'Trainer')
  async schedule(
    @Body() body: { username: string; title?: string; body?: string; icon?: string; sendAt?: string },
    @Res() res: Response,
  ): Promise<void> {
    if (!body?.sendAt) {
      res.status(400).json({ error: 'sendAt is required' });
      return;
    }
    const scheduledDateTime = new Date(body.sendAt);
    if (Number.isNaN(scheduledDateTime.getTime())) {
      res.status(400).json({ error: 'sendAt must be a valid date/time' });
      return;
    }
    const { notificationId } = await this.scheduleNotification.execute({
      recipientId: body.username,
      title: body.title || 'Demo notification',
      description: body.body || '',
      scheduledDateTime,
      icon: body.icon,
    });
    res.status(201).json({
      id: notificationId,
      username: body.username,
      title: body.title || 'Demo notification',
      body: body.body || '',
      icon: body.icon,
      sendAt: scheduledDateTime.toISOString(),
      status: 'pending',
    });
  }

  @Get('scheduled')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('Researcher', 'Trainer')
  async scheduled() {
    const list = await this.listNotifications.execute({ view: 'scheduled' });
    return list.map(toNotificationView);
  }

  @Delete('scheduled/:id')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('Researcher', 'Trainer')
  cancel(@Param('id') id: string): Promise<void> {
    return this.cancelScheduledNotification.execute({ notificationId: id });
  }

  @Get('cron/tick')
  async cronTick(@Headers('x-cron-secret') cronSecretHeader: string | undefined, @Res() res: Response): Promise<void> {
    const cronSecret = this.configService.get('CRON_SECRET');
    if (cronSecret && cronSecretHeader !== cronSecret) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    res.json(await this.runDueNotifications.execute());
  }
}
