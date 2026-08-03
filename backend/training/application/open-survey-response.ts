import { SurveyResponse } from 'domain/training';
import type { SurveyRepository, SurveyResponseRepository, GenerateId } from './ports.js';
import { trainingError } from './errors.js';

interface OpenSurveyResponseRequest {
  surveyId: string;
  userId: string;
}

// Idempotent: opening the same survey twice for the same userId returns the
// existing response rather than creating a second one. No enrollment check —
// any authenticated Participant userId can open a response; enrollment isn't
// enforced as a precondition for MVP.
export class OpenSurveyResponse {
  constructor(
    private surveyRepository: SurveyRepository,
    private surveyResponseRepository: SurveyResponseRepository,
    private generateId: GenerateId,
  ) {}

  async execute({ surveyId, userId }: OpenSurveyResponseRequest): Promise<SurveyResponse> {
    const existing = await this.surveyResponseRepository.findBySurveyAndUser(surveyId, userId);
    if (existing) {
      return existing;
    }

    const survey = await this.surveyRepository.findById(surveyId);
    if (!survey) {
      throw trainingError('no such survey', 'NOT_FOUND');
    }

    const response = SurveyResponse.open({ id: this.generateId(), surveyId, userId, now: new Date() });
    await this.surveyResponseRepository.save(response);
    return response;
  }
}
