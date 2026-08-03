import type { Observable } from 'rxjs';

export type AnswerFormatRequest =
  | { kind: 'FreeInput' }
  | { kind: 'Likert'; scale: string[] }
  | { kind: 'Choice'; options: string[]; allowMultiple: boolean };

export type AnswerFormatView =
  | { kind: 'FreeInput' }
  | { kind: 'Likert'; scale: string[] }
  | { kind: 'Choice'; options: string[]; allowMultiple: boolean };

export interface QuestionView {
  id: string;
  prompt: string;
  answerFormat: AnswerFormatView;
  parameterNames: string[];
  isParameterized: boolean;
}

export interface CreateQuestionRequest {
  prompt: string;
  answerFormat: AnswerFormatRequest;
}

export abstract class QuestionGateway {
  abstract create(request: CreateQuestionRequest): Observable<{ id: string }>;
  abstract list(): Observable<QuestionView[]>;
}

export interface TrainerView {
  id: string;
  name: string;
}

export interface CreateTrainerRequest {
  name: string;
}

export abstract class TrainerGateway {
  abstract create(request: CreateTrainerRequest): Observable<{ id: string }>;
  abstract list(): Observable<TrainerView[]>;
}

export interface TrainingView {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  trainerId: string;
}

export interface CreateTrainingRequest {
  title: string;
  description?: string;
  dateTime: string;
  trainerId: string;
}

export abstract class TrainingGateway {
  abstract create(request: CreateTrainingRequest): Observable<{ id: string }>;
  abstract list(): Observable<TrainingView[]>;
}

export interface BlackoutWindowView {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface EnrollmentView {
  trainingIds: string[];
  blackoutWindows: BlackoutWindowView[];
}

export abstract class EnrollmentGateway {
  abstract enroll(trainingId: string): Observable<{ trainingId: string }>;
  abstract me(): Observable<EnrollmentView>;
}

export interface SurveyQuestionView {
  questionId: string;
  parameterValues: Record<string, string>;
}

export interface ResourceView {
  id: string;
  url: string;
}

export interface SurveyView {
  id: string;
  trainingId: string;
  sendDate: string;
  questions: SurveyQuestionView[];
  resources: ResourceView[];
}

export interface CreateSurveyRequest {
  trainingId: string;
  sendDate: string;
  questionAssignments: SurveyQuestionView[];
  resources: { url: string }[];
}

export abstract class SurveyGateway {
  abstract create(request: CreateSurveyRequest): Observable<{ id: string }>;
  abstract list(): Observable<SurveyView[]>;
}

export interface AnswerView {
  questionId: string;
  value: string | string[];
}

export interface ResourceAccessView {
  resourceId: string;
  accessedTime: string;
}

export interface SurveyResponseView {
  id: string;
  surveyId: string;
  userId: string;
  status: string;
  openedTime: string;
  finishedTime: string | null;
  answers: AnswerView[];
  resourceAccesses: ResourceAccessView[];
}

export abstract class SurveyResponseGateway {
  abstract open(surveyId: string): Observable<SurveyResponseView>;
  abstract recordResourceAccess(surveyResponseId: string, resourceId: string): Observable<void>;
  abstract submit(surveyResponseId: string, answers: AnswerView[]): Observable<SurveyResponseView>;
  abstract get(surveyResponseId: string): Observable<SurveyResponseView>;
  abstract listForSurvey(surveyId: string): Observable<SurveyResponseView[]>;
}
