export interface NotificationDeliveryError extends Error {
  code?: string;
}

export function notificationDeliveryError(message: string, code: string): NotificationDeliveryError {
  const err: NotificationDeliveryError = new Error(message);
  err.code = code;
  return err;
}
