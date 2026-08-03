import type { Survey } from 'domain/training';
import type { SurveyRepository } from './ports.js';

export class ListSurveys {
  constructor(private surveyRepository: SurveyRepository) {}

  async execute(): Promise<Survey[]> {
    return this.surveyRepository.findAll();
  }
}
