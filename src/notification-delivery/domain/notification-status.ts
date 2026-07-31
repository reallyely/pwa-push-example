const STATUSES = Object.freeze({
  SCHEDULED: 'Scheduled',
  SENT: 'Sent',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
} as const);

export type NotificationStatus = (typeof STATUSES)[keyof typeof STATUSES];

const ALL: readonly NotificationStatus[] = Object.freeze(Object.values(STATUSES));

function isValid(status: string): status is NotificationStatus {
  return (ALL as readonly string[]).includes(status);
}

module.exports = { STATUSES, ALL, isValid };
