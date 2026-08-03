import type { Trainer } from 'domain/training';

export interface TrainerView {
  id: string;
  name: string;
}

export function toTrainerView(trainer: Trainer): TrainerView {
  return {
    id: trainer.id,
    name: trainer.name,
  };
}
