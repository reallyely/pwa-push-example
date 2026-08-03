import { Trainer } from 'domain/training';
import type { TrainerRepository, GenerateId } from './ports.js';

interface CreateTrainerRequest {
  name: string;
}

interface CreateTrainerResponse {
  trainerId: string;
}

export class CreateTrainer {
  constructor(
    private trainerRepository: TrainerRepository,
    private generateId: GenerateId,
  ) {}

  async execute({ name }: CreateTrainerRequest): Promise<CreateTrainerResponse> {
    const trainer = Trainer.create({
      id: this.generateId(),
      name,
    });
    await this.trainerRepository.save(trainer);
    return { trainerId: trainer.id };
  }
}
