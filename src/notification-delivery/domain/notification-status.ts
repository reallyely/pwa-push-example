export const STATUSES = Object.freeze({
  SCHEDULED: 'Scheduled',
  SENT: 'Sent',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
} as const);

export type NotificationStatus = (typeof STATUSES)[keyof typeof STATUSES];

export const ALL: readonly NotificationStatus[] = Object.freeze(Object.values(STATUSES));

export function isValid(status: string): status is NotificationStatus {
  return (ALL as readonly string[]).includes(status);
}
