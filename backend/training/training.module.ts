import { Module } from '@nestjs/common';
import { QUESTION_REPOSITORY, GENERATE_ID, type QuestionRepository } from './application/ports.js';
import { SqliteQuestionRepository } from './infrastructure/sqlite-question-repository.js';
import { CreateQuestion } from './application/create-question.js';
import { GetQuestion } from './application/get-question.js';
import { ListQuestions } from './application/list-questions.js';
import { QuestionsController } from './interface/questions.controller.js';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Module({
  controllers: [QuestionsController],
  providers: [
    { provide: QUESTION_REPOSITORY, useClass: SqliteQuestionRepository },
    { provide: GENERATE_ID, useValue: generateId },

    {
      provide: CreateQuestion,
      useFactory: (questionRepository: QuestionRepository, generateIdFn: () => string) =>
        new CreateQuestion(questionRepository, generateIdFn),
      inject: [QUESTION_REPOSITORY, GENERATE_ID],
    },
    {
      provide: GetQuestion,
      useFactory: (questionRepository: QuestionRepository) => new GetQuestion(questionRepository),
      inject: [QUESTION_REPOSITORY],
    },
    {
      provide: ListQuestions,
      useFactory: (questionRepository: QuestionRepository) => new ListQuestions(questionRepository),
      inject: [QUESTION_REPOSITORY],
    },
  ],
})
export class TrainingModule {}
