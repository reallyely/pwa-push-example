import type { Training } from 'domain/training';

export interface TrainingView {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  trainerId: string;
}

export function toTrainingView(training: Training): TrainingView {
  return {
    id: training.id,
    title: training.title,
    description: training.description,
    dateTime: training.dateTime.toISOString(),
    trainerId: training.trainerId,
  };
}
