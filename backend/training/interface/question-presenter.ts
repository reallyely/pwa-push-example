import type { Question } from 'domain/training';

export interface QuestionView {
  id: string;
  prompt: string;
  answerFormat: Question['answerFormat'];
  parameterNames: string[];
  isParameterized: boolean;
}

export function toQuestionView(question: Question): QuestionView {
  return {
    id: question.id,
    prompt: question.prompt,
    answerFormat: question.answerFormat,
    parameterNames: question.parameterNames,
    isParameterized: question.isParameterized,
  };
}
