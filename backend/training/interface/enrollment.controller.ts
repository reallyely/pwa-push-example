import { Body, Controller, Get, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { EnrollInTraining } from '#training/application/enroll-in-training.js';
import { GetMyEnrollment } from '#training/application/get-my-enrollment.js';
import { SessionAuthGuard } from '#identity/interface/session-auth.guard.js';
import { RolesGuard } from '#identity/interface/roles.guard.js';
import { Roles } from '#identity/interface/roles.decorator.js';
import { TrainingExceptionFilter } from './training-exception.filter.js';

@Controller('api')
@UseFilters(TrainingExceptionFilter)
@UseGuards(SessionAuthGuard, RolesGuard)
export class EnrollmentController {
  constructor(
    private enrollInTraining: EnrollInTraining,
    private getMyEnrollment: GetMyEnrollment,
  ) {}

  @Post('enrollments')
  @Roles('Participant')
  async enroll(@Body() body: { trainingId: string }, @Req() req: Request) {
    const userId = (req as any).user.id;
    await this.enrollInTraining.execute({ userId, trainingId: body?.trainingId });
    return { trainingId: body?.trainingId };
  }

  @Get('enrollments/me')
  async me(@Req() req: Request) {
    const userId = (req as any).user.id;
    const { trainingIds, blackoutWindows } = await this.getMyEnrollment.execute({ userId });
    return {
      trainingIds,
      blackoutWindows: blackoutWindows.map((window) => ({
        dayOfWeek: window.dayOfWeek,
        startTime: window.startTime,
        endTime: window.endTime,
      })),
    };
  }
}
