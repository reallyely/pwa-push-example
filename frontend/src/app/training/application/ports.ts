import type { Observable } from 'rxjs';

export type AnswerFormatRequest =
  | { kind: 'FreeInput' }
  | { kind: 'Likert'; scale: string[] }
  | { kind: 'Choice'; options: string[]; allowMultiple: boolean };

export type AnswerFormatView =
  | { kind: 'FreeInput' }
  | { kind: 'Likert'; scale: string[] }
  | { kind: 'Choice'; options: string[]; allowMultiple: boolean };

export interface QuestionView {
  id: string;
  prompt: string;
  answerFormat: AnswerFormatView;
  parameterNames: string[];
  isParameterized: boolean;
}

export interface CreateQuestionRequest {
  prompt: string;
  answerFormat: AnswerFormatRequest;
}

export abstract class QuestionGateway {
  abstract create(request: CreateQuestionRequest): Observable<{ id: string }>;
  abstract list(): Observable<QuestionView[]>;
}
