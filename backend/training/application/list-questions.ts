import type { Question } from 'domain/training';
import type { QuestionRepository } from './ports.js';

export class ListQuestions {
  constructor(private questionRepository: QuestionRepository) {}

  async execute(): Promise<Question[]> {
    return this.questionRepository.findAll();
  }
}
