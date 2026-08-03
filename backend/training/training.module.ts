import { Module } from '@nestjs/common';
import {
  QUESTION_REPOSITORY,
  TRAINER_REPOSITORY,
  TRAINING_REPOSITORY,
  TRAINING_ENROLLMENT_REPOSITORY,
  BLACKOUT_WINDOW_REPOSITORY,
  SURVEY_REPOSITORY,
  SURVEY_RESPONSE_REPOSITORY,
  GENERATE_ID,
  type QuestionRepository,
  type TrainerRepository,
  type TrainingRepository,
  type TrainingEnrollmentRepository,
  type BlackoutWindowRepository,
  type SurveyRepository,
  type SurveyResponseRepository,
} from './application/ports.js';
import { SqliteQuestionRepository } from './infrastructure/sqlite-question-repository.js';
import { SqliteTrainerRepository } from './infrastructure/sqlite-trainer-repository.js';
import { SqliteTrainingRepository } from './infrastructure/sqlite-training-repository.js';
import { SqliteTrainingEnrollmentRepository } from './infrastructure/sqlite-training-enrollment-repository.js';
import { SqliteBlackoutWindowRepository } from './infrastructure/sqlite-blackout-window-repository.js';
import { SqliteSurveyRepository } from './infrastructure/sqlite-survey-repository.js';
import { SqliteSurveyResponseRepository } from './infrastructure/sqlite-survey-response-repository.js';
import { CreateQuestion } from './application/create-question.js';
import { GetQuestion } from './application/get-question.js';
import { ListQuestions } from './application/list-questions.js';
import { CreateTrainer } from './application/create-trainer.js';
import { GetTrainer } from './application/get-trainer.js';
import { ListTrainers } from './application/list-trainers.js';
import { CreateTraining } from './application/create-training.js';
import { GetTraining } from './application/get-training.js';
import { ListTrainings } from './application/list-trainings.js';
import { EnrollInTraining } from './application/enroll-in-training.js';
import { GetMyEnrollment } from './application/get-my-enrollment.js';
import { CreateSurvey } from './application/create-survey.js';
import { GetSurvey } from './application/get-survey.js';
import { ListSurveys } from './application/list-surveys.js';
import { OpenSurveyResponse } from './application/open-survey-response.js';
import { RecordResourceAccess } from './application/record-resource-access.js';
import { SubmitSurveyResponse } from './application/submit-survey-response.js';
import { GetSurveyResponse } from './application/get-survey-response.js';
import { ListSurveyResponses } from './application/list-survey-responses.js';
import { QuestionsController } from './interface/questions.controller.js';
import { TrainersController } from './interface/trainers.controller.js';
import { TrainingsController } from './interface/trainings.controller.js';
import { EnrollmentController } from './interface/enrollment.controller.js';
import { SurveysController } from './interface/surveys.controller.js';
import { SurveyResponsesController } from './interface/survey-responses.controller.js';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Module({
  controllers: [QuestionsController, TrainersController, TrainingsController, EnrollmentController, SurveysController, SurveyResponsesController],
  providers: [
    { provide: QUESTION_REPOSITORY, useClass: SqliteQuestionRepository },
    { provide: TRAINER_REPOSITORY, useClass: SqliteTrainerRepository },
    { provide: TRAINING_REPOSITORY, useClass: SqliteTrainingRepository },
    { provide: TRAINING_ENROLLMENT_REPOSITORY, useClass: SqliteTrainingEnrollmentRepository },
    { provide: BLACKOUT_WINDOW_REPOSITORY, useClass: SqliteBlackoutWindowRepository },
    { provide: SURVEY_REPOSITORY, useClass: SqliteSurveyRepository },
    { provide: SURVEY_RESPONSE_REPOSITORY, useClass: SqliteSurveyResponseRepository },
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

    {
      provide: CreateTrainer,
      useFactory: (trainerRepository: TrainerRepository, generateIdFn: () => string) =>
        new CreateTrainer(trainerRepository, generateIdFn),
      inject: [TRAINER_REPOSITORY, GENERATE_ID],
    },
    {
      provide: GetTrainer,
      useFactory: (trainerRepository: TrainerRepository) => new GetTrainer(trainerRepository),
      inject: [TRAINER_REPOSITORY],
    },
    {
      provide: ListTrainers,
      useFactory: (trainerRepository: TrainerRepository) => new ListTrainers(trainerRepository),
      inject: [TRAINER_REPOSITORY],
    },

    {
      provide: CreateTraining,
      useFactory: (trainingRepository: TrainingRepository, generateIdFn: () => string) =>
        new CreateTraining(trainingRepository, generateIdFn),
      inject: [TRAINING_REPOSITORY, GENERATE_ID],
    },
    {
      provide: GetTraining,
      useFactory: (trainingRepository: TrainingRepository) => new GetTraining(trainingRepository),
      inject: [TRAINING_REPOSITORY],
    },
    {
      provide: ListTrainings,
      useFactory: (trainingRepository: TrainingRepository) => new ListTrainings(trainingRepository),
      inject: [TRAINING_REPOSITORY],
    },

    {
      provide: EnrollInTraining,
      useFactory: (trainingRepository: TrainingRepository, trainingEnrollmentRepository: TrainingEnrollmentRepository) =>
        new EnrollInTraining(trainingRepository, trainingEnrollmentRepository),
      inject: [TRAINING_REPOSITORY, TRAINING_ENROLLMENT_REPOSITORY],
    },
    {
      provide: GetMyEnrollment,
      useFactory: (trainingEnrollmentRepository: TrainingEnrollmentRepository, blackoutWindowRepository: BlackoutWindowRepository) =>
        new GetMyEnrollment(trainingEnrollmentRepository, blackoutWindowRepository),
      inject: [TRAINING_ENROLLMENT_REPOSITORY, BLACKOUT_WINDOW_REPOSITORY],
    },

    {
      provide: CreateSurvey,
      useFactory: (
        trainingRepository: TrainingRepository,
        questionRepository: QuestionRepository,
        surveyRepository: SurveyRepository,
        generateIdFn: () => string,
      ) => new CreateSurvey(trainingRepository, questionRepository, surveyRepository, generateIdFn),
      inject: [TRAINING_REPOSITORY, QUESTION_REPOSITORY, SURVEY_REPOSITORY, GENERATE_ID],
    },
    {
      provide: GetSurvey,
      useFactory: (surveyRepository: SurveyRepository) => new GetSurvey(surveyRepository),
      inject: [SURVEY_REPOSITORY],
    },
    {
      provide: ListSurveys,
      useFactory: (surveyRepository: SurveyRepository) => new ListSurveys(surveyRepository),
      inject: [SURVEY_REPOSITORY],
    },

    {
      provide: OpenSurveyResponse,
      useFactory: (surveyRepository: SurveyRepository, surveyResponseRepository: SurveyResponseRepository, generateIdFn: () => string) =>
        new OpenSurveyResponse(surveyRepository, surveyResponseRepository, generateIdFn),
      inject: [SURVEY_REPOSITORY, SURVEY_RESPONSE_REPOSITORY, GENERATE_ID],
    },
    {
      provide: RecordResourceAccess,
      useFactory: (surveyResponseRepository: SurveyResponseRepository) => new RecordResourceAccess(surveyResponseRepository),
      inject: [SURVEY_RESPONSE_REPOSITORY],
    },
    {
      provide: SubmitSurveyResponse,
      useFactory: (surveyResponseRepository: SurveyResponseRepository) => new SubmitSurveyResponse(surveyResponseRepository),
      inject: [SURVEY_RESPONSE_REPOSITORY],
    },
    {
      provide: GetSurveyResponse,
      useFactory: (surveyResponseRepository: SurveyResponseRepository) => new GetSurveyResponse(surveyResponseRepository),
      inject: [SURVEY_RESPONSE_REPOSITORY],
    },
    {
      provide: ListSurveyResponses,
      useFactory: (surveyResponseRepository: SurveyResponseRepository) => new ListSurveyResponses(surveyResponseRepository),
      inject: [SURVEY_RESPONSE_REPOSITORY],
    },
  ],
})
export class TrainingModule {}
