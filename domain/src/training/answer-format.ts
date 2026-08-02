export interface FreeInputAnswerFormat {
  kind: 'FreeInput';
}

export interface LikertAnswerFormat {
  kind: 'Likert';
  scale: readonly string[];
}

export interface ChoiceAnswerFormat {
  kind: 'Choice';
  options: readonly string[];
  allowMultiple: boolean;
}

export type AnswerFormat = FreeInputAnswerFormat | LikertAnswerFormat | ChoiceAnswerFormat;

function freeInput(): FreeInputAnswerFormat {
  return { kind: 'FreeInput' };
}

function likert(scale: string[]): LikertAnswerFormat {
  const points = scale.map((label) => label.trim());
  if (points.length < 2) {
    throw new Error('Likert scale requires at least 2 points');
  }
  if (points.some((label) => !label)) {
    throw new Error('Likert scale points must not be empty');
  }
  return { kind: 'Likert', scale: Object.freeze(points) };
}

function choice(options: string[], allowMultiple: boolean): ChoiceAnswerFormat {
  const values = options.map((option) => option.trim());
  if (values.length < 2) {
    throw new Error('Choice requires at least 2 options');
  }
  if (values.some((option) => !option)) {
    throw new Error('Choice options must not be empty');
  }
  if (new Set(values).size !== values.length) {
    throw new Error('Choice options must be unique');
  }
  return { kind: 'Choice', options: Object.freeze(values), allowMultiple };
}

export const AnswerFormat = Object.freeze({ freeInput, likert, choice });
