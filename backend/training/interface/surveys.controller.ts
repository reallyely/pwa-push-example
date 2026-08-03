import { Body, Controller, Get, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { CreateSurvey } from '#training/application/create-survey.js';
import { GetSurvey } from '#training/application/get-survey.js';
import { ListSurveys } from '#training/application/list-surveys.js';
import { SessionAuthGuard } from '#identity/interface/session-auth.guard.js';
import { RolesGuard } from '#identity/interface/roles.guard.js';
import { Roles } from '#identity/interface/roles.decorator.js';
import { toSurveyView } from './survey-presenter.js';
import { TrainingExceptionFilter } from './training-exception.filter.js';

@Controller('api')
@UseFilters(TrainingExceptionFilter)
@UseGuards(SessionAuthGuard, RolesGuard)
export class SurveysController {
  constructor(
    private createSurvey: CreateSurvey,
    private getSurvey: GetSurvey,
    private listSurveys: ListSurveys,
  ) {}

  @Post('surveys')
  @Roles('Researcher')
  async create(
    @Body()
    body: {
      trainingId: string;
      sendDate: string;
      questionAssignments: { questionId: string; parameterValues: Record<string, string> }[];
      resources: { url: string }[];
    },
  ) {
    const { surveyId } = await this.createSurvey.execute({
      trainingId: body?.trainingId,
      sendDate: body?.sendDate,
      questionAssignments: body?.questionAssignments ?? [],
      resources: body?.resources ?? [],
    });
    return { id: surveyId };
  }

  @Get('surveys')
  async list() {
    const surveys = await this.listSurveys.execute();
    return surveys.map(toSurveyView);
  }

  @Get('surveys/:id')
  async byId(@Param('id') id: string) {
    const survey = await this.getSurvey.execute({ surveyId: id });
    return toSurveyView(survey);
  }
}
