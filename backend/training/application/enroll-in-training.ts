import type { TrainingRepository, TrainingEnrollmentRepository } from './ports.js';
import { trainingError } from './errors.js';

interface EnrollInTrainingRequest {
  userId: string;
  trainingId: string;
}

export class EnrollInTraining {
  constructor(
    private trainingRepository: TrainingRepository,
    private trainingEnrollmentRepository: TrainingEnrollmentRepository,
  ) {}

  async execute({ userId, trainingId }: EnrollInTrainingRequest): Promise<void> {
    const training = await this.trainingRepository.findById(trainingId);
    if (!training) {
      throw trainingError('no such training', 'NOT_FOUND');
    }
    await this.trainingEnrollmentRepository.enroll(trainingId, userId);
  }
}
