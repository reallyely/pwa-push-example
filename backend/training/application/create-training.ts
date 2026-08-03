import { Training } from 'domain/training';
import type { TrainingRepository, GenerateId } from './ports.js';

interface CreateTrainingRequest {
  title: string;
  description?: string;
  dateTime: string;
  trainerId: string;
}

interface CreateTrainingResponse {
  trainingId: string;
}

export class CreateTraining {
  constructor(
    private trainingRepository: TrainingRepository,
    private generateId: GenerateId,
  ) {}

  async execute({ title, description, dateTime, trainerId }: CreateTrainingRequest): Promise<CreateTrainingResponse> {
    const training = Training.schedule({
      id: this.generateId(),
      title,
      description,
      dateTime: new Date(dateTime),
      trainerId,
    });
    await this.trainingRepository.save(training);
    return { trainingId: training.id };
  }
}
