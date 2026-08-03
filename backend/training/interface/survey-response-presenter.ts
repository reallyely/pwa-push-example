import type { SurveyResponse } from 'domain/training';

export interface SurveyResponseView {
  id: string;
  surveyId: string;
  userId: string;
  status: string;
  openedTime: string;
  finishedTime: string | null;
  answers: { questionId: string; value: string | string[] }[];
  resourceAccesses: { resourceId: string; accessedTime: string }[];
}

export function toSurveyResponseView(surveyResponse: SurveyResponse): SurveyResponseView {
  return {
    id: surveyResponse.id,
    surveyId: surveyResponse.surveyId,
    userId: surveyResponse.userId,
    status: surveyResponse.status,
    openedTime: surveyResponse.openedTime.toISOString(),
    finishedTime: surveyResponse.finishedTime ? surveyResponse.finishedTime.toISOString() : null,
    answers: surveyResponse.answers,
    resourceAccesses: surveyResponse.resourceAccesses.map((access) => ({
      resourceId: access.resourceId,
      accessedTime: access.accessedTime.toISOString(),
    })),
  };
}
