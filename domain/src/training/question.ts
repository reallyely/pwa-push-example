import type { AnswerFormat } from '#training/answer-format';

const PARAMETER_PATTERN = /<([a-zA-Z][\w-]*)>/g;

interface QuestionProps {
  id: string;
  prompt: string;
  answerFormat: AnswerFormat;
}

interface DomainError extends Error {
  code?: string;
}

export class Question {
  id: string;
  prompt: string;
  answerFormat: AnswerFormat;

  constructor({ id, prompt, answerFormat }: QuestionProps) {
    this.id = id;
    this.prompt = prompt;
    this.answerFormat = answerFormat;
  }

  // The only creation path.
  static create({ id, prompt, answerFormat }: QuestionProps): Question {
    if (!id) throw new Error('Question requires an id');
    if (!prompt || !prompt.trim()) throw new Error('Question requires a non-empty prompt');
    if (!answerFormat) throw new Error('Question requires an answerFormat');
    return new Question({ id, prompt, answerFormat });
  }

  // Derived from prompt rather than stored separately, so there is nothing
  // to keep in sync: the placeholders in the text are the parameter list.
  get parameterNames(): string[] {
    const names: string[] = [];
    for (const match of this.prompt.matchAll(PARAMETER_PATTERN)) {
      const name = match[1];
      if (!names.includes(name)) names.push(name);
    }
    return names;
  }

  get isParameterized(): boolean {
    return this.parameterNames.length > 0;
  }

  // Ready for the future Survey side of "instantiated into a Survey" to
  // call once a parameter value is chosen — Question itself never learns
  // about Survey.
  renderPrompt(parameterValues: Record<string, string>): string {
    const names = this.parameterNames;
    const missing = names.filter((name) => !(name in parameterValues));
    if (missing.length > 0) {
      const err: DomainError = new Error(`missing value(s) for parameter(s): ${missing.join(', ')}`);
      err.code = 'MISSING_PARAMETER_VALUES';
      throw err;
    }
    const unexpected = Object.keys(parameterValues).filter((name) => !names.includes(name));
    if (unexpected.length > 0) {
      const err: DomainError = new Error(`unexpected parameter(s): ${unexpected.join(', ')}`);
      err.code = 'UNEXPECTED_PARAMETER_VALUES';
      throw err;
    }
    return this.prompt.replace(PARAMETER_PATTERN, (_match, name: string) => parameterValues[name]);
  }
}
