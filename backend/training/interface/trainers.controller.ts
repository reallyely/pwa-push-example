import { Body, Controller, Get, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { CreateTrainer } from '#training/application/create-trainer.js';
import { GetTrainer } from '#training/application/get-trainer.js';
import { ListTrainers } from '#training/application/list-trainers.js';
import { SessionAuthGuard } from '#identity/interface/session-auth.guard.js';
import { RolesGuard } from '#identity/interface/roles.guard.js';
import { Roles } from '#identity/interface/roles.decorator.js';
import { toTrainerView } from './trainer-presenter.js';
import { TrainingExceptionFilter } from './training-exception.filter.js';

@Controller('api')
@UseFilters(TrainingExceptionFilter)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('Researcher')
export class TrainersController {
  constructor(
    private createTrainer: CreateTrainer,
    private getTrainer: GetTrainer,
    private listTrainers: ListTrainers,
  ) {}

  @Post('trainers')
  async create(@Body() body: { name: string }) {
    const { trainerId } = await this.createTrainer.execute({
      name: body?.name,
    });
    return { id: trainerId };
  }

  @Get('trainers')
  async list() {
    const trainers = await this.listTrainers.execute();
    return trainers.map(toTrainerView);
  }

  @Get('trainers/:id')
  async byId(@Param('id') id: string) {
    const trainer = await this.getTrainer.execute({ trainerId: id });
    return toTrainerView(trainer);
  }
}
