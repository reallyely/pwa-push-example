import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import type { NotificationDeliveryError } from '#notification-delivery/application/errors.js';

const ERROR_STATUS_BY_CODE: Record<string, number> = {
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  INVALID_SCHEDULE: 400,
  INVALID_TRANSITION: 409,
};

@Catch()
export class NotificationDeliveryExceptionFilter implements ExceptionFilter {
  catch(err: NotificationDeliveryError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status = (err.code && ERROR_STATUS_BY_CODE[err.code]) || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message });
  }
}
