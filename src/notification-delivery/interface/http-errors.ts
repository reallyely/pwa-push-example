import type { NotificationDeliveryError } from '#notification-delivery/application/errors.ts';

const ERROR_STATUS_BY_CODE: Record<string, number> = {
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  INVALID_SCHEDULE: 400,
  INVALID_TRANSITION: 409,
};

export function sendError(res: any, err: NotificationDeliveryError, fallbackStatus = 500): void {
  const status = (err.code && ERROR_STATUS_BY_CODE[err.code]) || fallbackStatus;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message });
}
