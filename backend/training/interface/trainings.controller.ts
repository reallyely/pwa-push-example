import { Body, Controller, Get, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { CreateTraining } from '#training/application/create-training.js';
import { GetTraining } from '#training/application/get-training.js';
import { ListTrainings } from '#training/application/list-trainings.js';
import { SessionAuthGuard } from '#identity/interface/session-auth.guard.js';
import { RolesGuard } from '#identity/interface/roles.guard.js';
import { Roles } from '#identity/interface/roles.decorator.js';
import { toTrainingView } from './training-presenter.js';
import { TrainingExceptionFilter } from './training-exception.filter.js';

@Controller('api')
@UseFilters(TrainingExceptionFilter)
@UseGuards(SessionAuthGuard, RolesGuard)
export class TrainingsController {
  constructor(
    private createTraining: CreateTraining,
    private getTraining: GetTraining,
    private listTrainings: ListTrainings,
  ) {}

  @Post('trainings')
  @Roles('Researcher')
  async create(@Body() body: { title: string; description?: string; dateTime: string; trainerId: string }) {
    const { trainingId } = await this.createTraining.execute({
      title: body?.title,
      description: body?.description,
      dateTime: body?.dateTime,
      trainerId: body?.trainerId,
    });
    return { id: trainingId };
  }

  @Get('trainings')
  async list() {
    const trainings = await this.listTrainings.execute();
    return trainings.map(toTrainingView);
  }

  @Get('trainings/:id')
  async byId(@Param('id') id: string) {
    const training = await this.getTraining.execute({ trainingId: id });
    return toTrainingView(training);
  }
}
