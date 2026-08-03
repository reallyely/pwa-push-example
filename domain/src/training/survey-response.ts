export interface Answer {
  questionId: string;
  value: string | string[];
}

export interface ResourceAccess {
  resourceId: string;
  accessedTime: Date;
}

export const SURVEY_RESPONSE_STATUSES = Object.freeze({
  OPENED: 'Opened',
  FINISHED: 'Finished',
} as const);

export type SurveyResponseStatus = (typeof SURVEY_RESPONSE_STATUSES)[keyof typeof SURVEY_RESPONSE_STATUSES];

interface SurveyResponseProps {
  id: string;
  surveyId: string;
  userId: string;
  status: SurveyResponseStatus;
  openedTime: Date;
  finishedTime?: Date | null;
  answers?: Answer[];
  resourceAccesses?: ResourceAccess[];
}

interface OpenSurveyResponseInput {
  id: string;
  surveyId: string;
  userId: string;
  now: Date;
}

interface DomainError extends Error {
  code?: string;
}

export class SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  status: SurveyResponseStatus;
  openedTime: Date;
  finishedTime: Date | null;
  answers: Answer[];
  resourceAccesses: ResourceAccess[];

  constructor({
    id,
    surveyId,
    userId,
    status,
    openedTime,
    finishedTime = null,
    answers = [],
    resourceAccesses = [],
  }: SurveyResponseProps) {
    this.id = id;
    this.surveyId = surveyId;
    this.userId = userId;
    this.status = status;
    this.openedTime = openedTime;
    this.finishedTime = finishedTime;
    this.answers = answers;
    this.resourceAccesses = resourceAccesses;
  }

  // The only creation path. userId directly, no participantId — a
  // SurveyResponse references the enrolled person by the Identity context's
  // User.id, same as Enrollment does.
  static open({ id, surveyId, userId, now }: OpenSurveyResponseInput): SurveyResponse {
    if (!id) throw new Error('SurveyResponse requires an id');
    if (!surveyId) throw new Error('SurveyResponse requires a surveyId');
    if (!userId) throw new Error('SurveyResponse requires a userId');
    if (!(now instanceof Date) || isNaN(now.getTime())) {
      throw new Error('SurveyResponse requires a valid now');
    }
    return new SurveyResponse({
      id,
      surveyId,
      userId,
      status: SURVEY_RESPONSE_STATUSES.OPENED,
      openedTime: now,
    });
  }

  // Allowed in any state — a participant may revisit a resource link after
  // finishing.
  accessResource(resourceId: string, now: Date): void {
    if (!resourceId) throw new Error('accessResource requires a resourceId');
    if (!(now instanceof Date) || isNaN(now.getTime())) {
      throw new Error('accessResource requires a valid now');
    }
    this.resourceAccesses.push({ resourceId, accessedTime: now });
  }

  finish(answers: Answer[], now: Date): void {
    if (this.status === SURVEY_RESPONSE_STATUSES.FINISHED) {
      const err: DomainError = new Error('cannot finish a survey response that is already Finished');
      err.code = 'ALREADY_FINISHED';
      throw err;
    }
    if (!(now instanceof Date) || isNaN(now.getTime())) {
      throw new Error('finish requires a valid now');
    }
    this.answers = answers;
    this.finishedTime = now;
    this.status = SURVEY_RESPONSE_STATUSES.FINISHED;
  }
}
