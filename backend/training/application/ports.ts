import type { Question, Trainer, Training, BlackoutWindow, Survey, SurveyResponse } from 'domain/training';

export const QUESTION_REPOSITORY = Symbol('QuestionRepository');

export interface QuestionRepository {
  findById(id: string): Promise<Question | null>;
  findAll(): Promise<Question[]>;
  save(question: Question): Promise<void>;
}

export const TRAINER_REPOSITORY = Symbol('TrainerRepository');

export interface TrainerRepository {
  findById(id: string): Promise<Trainer | null>;
  findAll(): Promise<Trainer[]>;
  save(trainer: Trainer): Promise<void>;
}

export const TRAINING_REPOSITORY = Symbol('TrainingRepository');

export interface TrainingRepository {
  findById(id: string): Promise<Training | null>;
  findAll(): Promise<Training[]>;
  save(training: Training): Promise<void>;
}

export const TRAINING_ENROLLMENT_REPOSITORY = Symbol('TrainingEnrollmentRepository');

// A plain userId x trainingId join — no wrapping entity/id, per
// docs/domain-model.md's "Enrollment & blackout window" slice: enrollment
// and blackout window relate to Training/User without a Participant
// aggregate.
export interface TrainingEnrollmentRepository {
  enroll(trainingId: string, userId: string): Promise<void>;
  findTrainingIdsByUser(userId: string): Promise<string[]>;
  findUserIdsByTraining(trainingId: string): Promise<string[]>;
}

export const BLACKOUT_WINDOW_REPOSITORY = Symbol('BlackoutWindowRepository');

// Keyed directly by userId, independent of any particular enrollment — one
// baseline applies across all Trainings.
export interface BlackoutWindowRepository {
  findByUserId(userId: string): Promise<BlackoutWindow[]>;
  save(userId: string, windows: BlackoutWindow[]): Promise<void>;
}

export const SURVEY_REPOSITORY = Symbol('SurveyRepository');

export interface SurveyRepository {
  findById(id: string): Promise<Survey | null>;
  findAll(): Promise<Survey[]>;
  save(survey: Survey): Promise<void>;
}

export const SURVEY_RESPONSE_REPOSITORY = Symbol('SurveyResponseRepository');

export interface SurveyResponseRepository {
  findById(id: string): Promise<SurveyResponse | null>;
  findBySurveyAndUser(surveyId: string, userId: string): Promise<SurveyResponse | null>;
  findBySurveyId(surveyId: string): Promise<SurveyResponse[]>;
  save(surveyResponse: SurveyResponse): Promise<void>;
}

// DI seam for id generation — a plain value (not really a "port" the way a
// repository/gateway is), colocated here since it's the natural place other
// application classes' constructors pull it in from. Its own symbol, not
// shared with notification-delivery's/identity's GENERATE_ID.
export const GENERATE_ID = Symbol('GenerateId');
export type GenerateId = () => string;
