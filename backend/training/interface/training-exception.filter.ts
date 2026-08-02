import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import type { TrainingError } from '#training/application/errors.js';

const ERROR_STATUS_BY_CODE: Record<string, number> = {
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
};

@Catch()
export class TrainingExceptionFilter implements ExceptionFilter {
  catch(err: TrainingError | HttpException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    // Guards (SessionAuthGuard, RolesGuard) throw Nest's own HttpExceptions
    // (401/403) directly rather than a coded TrainingError — pass those
    // through as-is instead of falling into the code-lookup below, which
    // would otherwise mis-map them to 500.
    if (err instanceof HttpException) {
      res.status(err.getStatus()).json({ error: err.message });
      return;
    }

    const status = (err.code && ERROR_STATUS_BY_CODE[err.code]) || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message });
  }
}
