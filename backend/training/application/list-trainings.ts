import type { Training } from 'domain/training';
import type { TrainingRepository } from './ports.js';

export class ListTrainings {
  constructor(private trainingRepository: TrainingRepository) {}

  async execute(): Promise<Training[]> {
    return this.trainingRepository.findAll();
  }
}
