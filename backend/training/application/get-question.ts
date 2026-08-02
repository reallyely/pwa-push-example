import type { QuestionRepository } from './ports.js';
import type { Question } from 'domain/training';
import { trainingError } from './errors.js';

interface GetQuestionRequest {
  questionId: string;
}

export class GetQuestion {
  constructor(private questionRepository: QuestionRepository) {}

  async execute({ questionId }: GetQuestionRequest): Promise<Question> {
    const question = await this.questionRepository.findById(questionId);
    if (!question) {
      throw trainingError('no such question', 'NOT_FOUND');
    }
    return question;
  }
}
