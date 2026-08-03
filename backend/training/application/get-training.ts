import type { TrainingRepository } from './ports.js';
import type { Training } from 'domain/training';
import { trainingError } from './errors.js';

interface GetTrainingRequest {
  trainingId: string;
}

export class GetTraining {
  constructor(private trainingRepository: TrainingRepository) {}

  async execute({ trainingId }: GetTrainingRequest): Promise<Training> {
    const training = await this.trainingRepository.findById(trainingId);
    if (!training) {
      throw trainingError('no such training', 'NOT_FOUND');
    }
    return training;
  }
}
