import { Body, Controller, Get, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { CreateQuestion, type AnswerFormatRequest } from '#training/application/create-question.js';
import { GetQuestion } from '#training/application/get-question.js';
import { ListQuestions } from '#training/application/list-questions.js';
import { SessionAuthGuard } from '#identity/interface/session-auth.guard.js';
import { RolesGuard } from '#identity/interface/roles.guard.js';
import { Roles } from '#identity/interface/roles.decorator.js';
import { toQuestionView } from './question-presenter.js';
import { TrainingExceptionFilter } from './training-exception.filter.js';

@Controller('api')
@UseFilters(TrainingExceptionFilter)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('Researcher')
export class QuestionsController {
  constructor(
    private createQuestion: CreateQuestion,
    private getQuestion: GetQuestion,
    private listQuestions: ListQuestions,
  ) {}

  @Post('questions')
  async create(@Body() body: { prompt: string; answerFormat: AnswerFormatRequest }) {
    const { questionId } = await this.createQuestion.execute({
      prompt: body?.prompt,
      answerFormat: body?.answerFormat,
    });
    return { id: questionId };
  }

  @Get('questions')
  async list() {
    const questions = await this.listQuestions.execute();
    return questions.map(toQuestionView);
  }

  @Get('questions/:id')
  async byId(@Param('id') id: string) {
    const question = await this.getQuestion.execute({ questionId: id });
    return toQuestionView(question);
  }
}
