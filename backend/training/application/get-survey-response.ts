import type { SurveyResponse } from 'domain/training';
import type { SurveyResponseRepository } from './ports.js';
import { trainingError } from './errors.js';

interface GetSurveyResponseRequest {
  surveyResponseId: string;
}

export class GetSurveyResponse {
  constructor(private surveyResponseRepository: SurveyResponseRepository) {}

  async execute({ surveyResponseId }: GetSurveyResponseRequest): Promise<SurveyResponse> {
    const surveyResponse = await this.surveyResponseRepository.findById(surveyResponseId);
    if (!surveyResponse) {
      throw trainingError('no such survey response', 'NOT_FOUND');
    }
    return surveyResponse;
  }
}
