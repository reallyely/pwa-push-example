import { Body, Controller, Get, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OpenSurveyResponse } from '#training/application/open-survey-response.js';
import { RecordResourceAccess } from '#training/application/record-resource-access.js';
import { SubmitSurveyResponse } from '#training/application/submit-survey-response.js';
import { GetSurveyResponse } from '#training/application/get-survey-response.js';
import { ListSurveyResponses } from '#training/application/list-survey-responses.js';
import { SessionAuthGuard } from '#identity/interface/session-auth.guard.js';
import { RolesGuard } from '#identity/interface/roles.guard.js';
import { Roles } from '#identity/interface/roles.decorator.js';
import { toSurveyResponseView } from './survey-response-presenter.js';
import { TrainingExceptionFilter } from './training-exception.filter.js';

@Controller('api')
@UseFilters(TrainingExceptionFilter)
@UseGuards(SessionAuthGuard, RolesGuard)
export class SurveyResponsesController {
  constructor(
    private openSurveyResponse: OpenSurveyResponse,
    private recordResourceAccess: RecordResourceAccess,
    private submitSurveyResponse: SubmitSurveyResponse,
    private getSurveyResponse: GetSurveyResponse,
    private listSurveyResponses: ListSurveyResponses,
  ) {}

  @Post('survey-responses')
  @Roles('Participant')
  async open(@Body() body: { surveyId: string }, @Req() req: Request) {
    const userId = (req as any).user.id;
    const surveyResponse = await this.openSurveyResponse.execute({ surveyId: body?.surveyId, userId });
    return toSurveyResponseView(surveyResponse);
  }

  @Post('survey-responses/:id/resource-access')
  @Roles('Participant')
  async recordAccess(@Param('id') id: string, @Body() body: { resourceId: string }) {
    await this.recordResourceAccess.execute({ surveyResponseId: id, resourceId: body?.resourceId });
    return { id };
  }

  @Post('survey-responses/:id/submit')
  @Roles('Participant')
  async submit(@Param('id') id: string, @Body() body: { answers: { questionId: string; value: string | string[] }[] }) {
    await this.submitSurveyResponse.execute({ surveyResponseId: id, answers: body?.answers ?? [] });
    return { id };
  }

  @Get('survey-responses/:id')
  async byId(@Param('id') id: string) {
    const surveyResponse = await this.getSurveyResponse.execute({ surveyResponseId: id });
    return toSurveyResponseView(surveyResponse);
  }

  @Get('surveys/:id/responses')
  @Roles('Researcher')
  async listForSurvey(@Param('id') id: string) {
    const surveyResponses = await this.listSurveyResponses.execute({ surveyId: id });
    return surveyResponses.map(toSurveyResponseView);
  }
}
