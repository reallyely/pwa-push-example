import type { TrainerRepository } from './ports.js';
import type { Trainer } from 'domain/training';
import { trainingError } from './errors.js';

interface GetTrainerRequest {
  trainerId: string;
}

export class GetTrainer {
  constructor(private trainerRepository: TrainerRepository) {}

  async execute({ trainerId }: GetTrainerRequest): Promise<Trainer> {
    const trainer = await this.trainerRepository.findById(trainerId);
    if (!trainer) {
      throw trainingError('no such trainer', 'NOT_FOUND');
    }
    return trainer;
  }
}
