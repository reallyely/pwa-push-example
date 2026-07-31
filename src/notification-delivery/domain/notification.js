const { STATUSES } = require('./notification-status');

class Notification {
  constructor({ id, recipientId, title, description, scheduledDateTime, icon = null, status, sentDateTime = null, failureReason = null }) {
    this.id = id;
    this.recipientId = recipientId;
    this.title = title;
    this.description = description;
    this.scheduledDateTime = scheduledDateTime;
    this.icon = icon;
    this.status = status;
    this.sentDateTime = sentDateTime;
    this.failureReason = failureReason;
  }

  // The only creation path. Guards scheduledDateTime here, at creation time —
  // not in the constructor, since a legitimately Scheduled notification will
  // naturally have a past scheduledDateTime by the time it's reloaded as due.
  static schedule({ id, recipientId, title, description, scheduledDateTime, icon = null }) {
    if (!recipientId) throw new Error('Notification requires a recipientId');
    if (!title) throw new Error('Notification requires a title');
    if (!(scheduledDateTime instanceof Date) || Number.isNaN(scheduledDateTime.getTime())) {
      throw new Error('Notification requires a valid scheduledDateTime');
    }
    if (scheduledDateTime.getTime() < Date.now()) {
      const err = new Error('scheduledDateTime must not be in the past');
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

  markSent(sentDateTime) {
    this._assertScheduled('markSent');
    this.status = STATUSES.SENT;
    this.sentDateTime = sentDateTime;
  }

  markFailed(reason) {
    this._assertScheduled('markFailed');
    this.status = STATUSES.FAILED;
    this.failureReason = reason;
  }

  cancel() {
    this._assertScheduled('cancel');
    this.status = STATUSES.CANCELLED;
  }

  isDue(now = new Date()) {
    return this.status === STATUSES.SCHEDULED && this.scheduledDateTime.getTime() <= now.getTime();
  }

  _assertScheduled(action) {
    if (this.status !== STATUSES.SCHEDULED) {
      const err = new Error(`cannot ${action} a notification that is already ${this.status}`);
      err.code = 'INVALID_TRANSITION';
      throw err;
    }
  }
}

module.exports = { Notification };
