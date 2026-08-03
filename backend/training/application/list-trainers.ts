import type { Trainer } from 'domain/training';
import type { TrainerRepository } from './ports.js';

export class ListTrainers {
  constructor(private trainerRepository: TrainerRepository) {}

  async execute(): Promise<Trainer[]> {
    return this.trainerRepository.findAll();
  }
}
