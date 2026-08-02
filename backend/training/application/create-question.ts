import { Question, AnswerFormat, type AnswerFormat as AnswerFormatValue } from 'domain/training';
import type { QuestionRepository, GenerateId } from './ports.js';
import { trainingError } from './errors.js';

export type AnswerFormatRequest =
  | { kind: 'FreeInput' }
  | { kind: 'Likert'; scale: string[] }
  | { kind: 'Choice'; options: string[]; allowMultiple: boolean };

interface CreateQuestionRequest {
  prompt: string;
  answerFormat: AnswerFormatRequest;
}

interface CreateQuestionResponse {
  questionId: string;
}

function toAnswerFormat(request: AnswerFormatRequest): AnswerFormatValue {
  switch (request.kind) {
    case 'FreeInput':
      return AnswerFormat.freeInput();
    case 'Likert':
      return AnswerFormat.likert(request.scale);
    case 'Choice':
      return AnswerFormat.choice(request.options, request.allowMultiple);
    default:
      throw trainingError('unknown answerFormat kind', 'INVALID_INPUT');
  }
}

export class CreateQuestion {
  constructor(
    private questionRepository: QuestionRepository,
    private generateId: GenerateId,
  ) {}

  async execute({ prompt, answerFormat }: CreateQuestionRequest): Promise<CreateQuestionResponse> {
    const question = Question.create({
      id: this.generateId(),
      prompt,
      answerFormat: toAnswerFormat(answerFormat),
    });
    await this.questionRepository.save(question);
    return { questionId: question.id };
  }
}
