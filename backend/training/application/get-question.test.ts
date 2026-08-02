import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GetQuestion } from './get-question.js';
import { Question, AnswerFormat } from 'domain/training';
import type { QuestionRepository } from './ports.js';

function fakeRepository(question: Question | null): QuestionRepository {
  return {
    async findById() { return question; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  } as unknown as QuestionRepository;
}

describe('GetQuestion', () => {
  test('returns the question when found', async () => {
    const question = Question.create({ id: 'q1', prompt: 'How was it?', answerFormat: AnswerFormat.freeInput() });
    const getQuestion = new GetQuestion(fakeRepository(question));

    const result = await getQuestion.execute({ questionId: 'q1' });

    assert.equal(result, question);
  });

  test('throws NOT_FOUND when no question has that id', async () => {
    const getQuestion = new GetQuestion(fakeRepository(null));

    await assert.rejects(
      () => getQuestion.execute({ questionId: 'missing' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });
});
