import type { SurveyResponseRepository } from './ports.js';
import { trainingError } from './errors.js';

interface RecordResourceAccessRequest {
  surveyResponseId: string;
  resourceId: string;
}

export class RecordResourceAccess {
  constructor(private surveyResponseRepository: SurveyResponseRepository) {}

  async execute({ surveyResponseId, resourceId }: RecordResourceAccessRequest): Promise<void> {
    const surveyResponse = await this.surveyResponseRepository.findById(surveyResponseId);
    if (!surveyResponse) {
      throw trainingError('no such survey response', 'NOT_FOUND');
    }
    surveyResponse.accessResource(resourceId, new Date());
    await this.surveyResponseRepository.save(surveyResponse);
  }
}
