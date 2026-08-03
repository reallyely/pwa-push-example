import type { SurveyResponse } from 'domain/training';
import type { SurveyResponseRepository } from './ports.js';

interface ListSurveyResponsesRequest {
  surveyId: string;
}

export class ListSurveyResponses {
  constructor(private surveyResponseRepository: SurveyResponseRepository) {}

  async execute({ surveyId }: ListSurveyResponsesRequest): Promise<SurveyResponse[]> {
    return this.surveyResponseRepository.findBySurveyId(surveyId);
  }
}
