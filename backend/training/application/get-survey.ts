import type { SurveyRepository } from './ports.js';
import type { Survey } from 'domain/training';
import { trainingError } from './errors.js';

interface GetSurveyRequest {
  surveyId: string;
}

export class GetSurvey {
  constructor(private surveyRepository: SurveyRepository) {}

  async execute({ surveyId }: GetSurveyRequest): Promise<Survey> {
    const survey = await this.surveyRepository.findById(surveyId);
    if (!survey) {
      throw trainingError('no such survey', 'NOT_FOUND');
    }
    return survey;
  }
}
