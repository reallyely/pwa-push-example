import type { Survey } from 'domain/training';

export interface SurveyView {
  id: string;
  trainingId: string;
  sendDate: string;
  questions: { questionId: string; parameterValues: Record<string, string> }[];
  resources: { id: string; url: string }[];
}

export function toSurveyView(survey: Survey): SurveyView {
  return {
    id: survey.id,
    trainingId: survey.trainingId,
    sendDate: survey.sendDate.toISOString(),
    questions: survey.questions,
    resources: survey.resources,
  };
}
