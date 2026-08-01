import { STATUSES } from './notification-status.js';
import type { NotificationStatus } from './notification-status.js';

interface NotificationProps {
  id: string;
  recipientId: string;
  title: string;
  description: string;
  scheduledDateTime: Date;
  icon?: string | null;
  status: NotificationStatus;
  sentDateTime?: Date | null;
  failureReason?: string | null;
}

interface ScheduleProps {
  id: string;
  recipientId: string;
  title: string;
  description: string;
  scheduledDateTime: Date;
  icon?: string | null;
}

interface DomainError extends Error {
  code?: string;
}

export class Notification {
  id: string;
  recipientId: string;
  title: string;
  description: string;
  scheduledDateTime: Date;
  icon: string | null;
  status: NotificationStatus;
  sentDateTime: Date | null;
  failureReason: string | null;

  constructor({
    id,
    recipientId,
    title,
    description,
    scheduledDateTime,
    icon = null,
    status,
    sentDateTime = null,
    failureReason = null,
  }: NotificationProps) {
    this.id = id;
    this.recipientId = recipientId;
    this.title = title;
    this.description = description;
    this.scheduledDateTime = scheduledDateTime;
    this.icon = icon ?? null;
    this.status = status;
    this.sentDateTime = sentDateTime;
    this.failureReason = failureReason;
  }

  // The only creation path. Guards scheduledDateTime here, at creation time —
  // not in the constructor, since a legitimately Scheduled notification will
  // naturally have a past scheduledDateTime by the time it's reloaded as due.
  static schedule({ id, recipientId, title, description, scheduledDateTime, icon = null }: ScheduleProps): Notification {
    if (!recipientId) throw new Error('Notification requires a recipientId');
    if (!title) throw new Error('Notification requires a title');
    if (!(scheduledDateTime instanceof Date) || Number.isNaN(scheduledDateTime.getTime())) {
      throw new Error('Notification requires a valid scheduledDateTime');
    }
    if (scheduledDateTime.getTime() < Date.now()) {
      const err: DomainError = new Error('scheduledDateTime must not be in the past');
      err.code = 'INVALID_SCHEDULE';
      throw err;
    }
    return new Notification({
      id,
      recipientId,
      title,
      description,
      scheduledDateTime,
      icon,
      status: STATUSES.SCHEDULED,
      sentDateTime: null,
      failureReason: null,
    });
  }

  markSent(sentDateTime: Date): void {
    this._assertScheduled('markSent');
    this.status = STATUSES.SENT;
    this.sentDateTime = sentDateTime;
  }

  markFailed(reason: string): void {
    this._assertScheduled('markFailed');
    this.status = STATUSES.FAILED;
    this.failureReason = reason;
  }

  cancel(): void {
    this._assertScheduled('cancel');
    this.status = STATUSES.CANCELLED;
  }

  isDue(now: Date = new Date()): boolean {
    return this.status === STATUSES.SCHEDULED && this.scheduledDateTime.getTime() <= now.getTime();
  }

  private _assertScheduled(action: string): void {
    if (this.status !== STATUSES.SCHEDULED) {
      const err: DomainError = new Error(`cannot ${action} a notification that is already ${this.status}`);
      err.code = 'INVALID_TRANSITION';
      throw err;
    }
  }
}
