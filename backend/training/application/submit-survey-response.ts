import type { Answer } from 'domain/training';
import type { SurveyResponseRepository } from './ports.js';
import { trainingError } from './errors.js';

interface SubmitSurveyResponseRequest {
  surveyResponseId: string;
  answers: Answer[];
}

export class SubmitSurveyResponse {
  constructor(private surveyResponseRepository: SurveyResponseRepository) {}

  async execute({ surveyResponseId, answers }: SubmitSurveyResponseRequest): Promise<void> {
    const surveyResponse = await this.surveyResponseRepository.findById(surveyResponseId);
    if (!surveyResponse) {
      throw trainingError('no such survey response', 'NOT_FOUND');
    }
    surveyResponse.finish(answers, new Date()); // propagates ALREADY_FINISHED if not currently Opened
    await this.surveyResponseRepository.save(surveyResponse);
  }
}
