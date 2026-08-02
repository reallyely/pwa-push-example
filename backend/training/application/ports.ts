import type { Question } from 'domain/training';

export const QUESTION_REPOSITORY = Symbol('QuestionRepository');

export interface QuestionRepository {
  findById(id: string): Promise<Question | null>;
  findAll(): Promise<Question[]>;
  save(question: Question): Promise<void>;
}

// DI seam for id generation — a plain value (not really a "port" the way a
// repository/gateway is), colocated here since it's the natural place other
// application classes' constructors pull it in from. Its own symbol, not
// shared with notification-delivery's/identity's GENERATE_ID.
export const GENERATE_ID = Symbol('GenerateId');
export type GenerateId = () => string;
