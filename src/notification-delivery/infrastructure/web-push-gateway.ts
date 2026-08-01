import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { PushGateway, PushGatewayResult } from '#notification-delivery/application/ports.js';
import type { PushSubscriptionJSON } from '#notification-delivery/domain/recipient.js';

interface WebPushError extends Error {
  statusCode?: number;
}

@Injectable()
export class WebPushGateway implements PushGateway, OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    webpush.setVapidDetails(
      this.configService.getOrThrow('VAPID_SUBJECT'),
      this.configService.getOrThrow('VAPID_PUBLIC_KEY'),
      this.configService.getOrThrow('VAPID_PRIVATE_KEY'),
    );
  }

  async send(pushSubscription: PushSubscriptionJSON, payload: string): Promise<PushGatewayResult> {
    try {
      // 'high' urgency maps to FCM high-priority, which Android's push service
      // wakes the device for even in Doze/App Standby. Default 'normal' can be
      // deferred indefinitely once the app is backgrounded and the device idles.
      await webpush.sendNotification(pushSubscription, payload, { urgency: 'high' });
      return { ok: true };
    } catch (err) {
      const pushErr = err as WebPushError;
      if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
        return { ok: false, reason: 'subscription-expired' };
      }
      console.error('[push] send failed', err);
      return { ok: false, reason: 'send-failed' };
    }
  }
}
