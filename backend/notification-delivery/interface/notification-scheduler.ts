import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RunDueNotifications } from '#notification-delivery/application/run-due-notifications.js';

@Injectable()
export class NotificationScheduler implements OnApplicationBootstrap {
  constructor(private runDueNotifications: RunDueNotifications) {}

  // Catches up on anything that came due while the process was down (e.g.
  // the Fly machine was stopped straight through the scheduled time).
  onApplicationBootstrap(): Promise<{ checked: number; sent: number }> {
    return this.runDueNotifications.execute();
  }

  @Interval(60_000)
  tick(): Promise<{ checked: number; sent: number }> {
    return this.runDueNotifications.execute();
  }
}
