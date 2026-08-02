import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ListQuestions } from './list-questions.js';
import { Question, AnswerFormat } from 'domain/training';
import type { QuestionRepository } from './ports.js';

function fakeRepository(questions: Question[]): QuestionRepository {
  return {
    async findById() { throw new Error('not used in this test'); },
    async findAll() { return questions; },
    async save() { throw new Error('not used in this test'); },
  } as unknown as QuestionRepository;
}

describe('ListQuestions', () => {
  test('returns everything the repository has', async () => {
    const questions = [
      Question.create({ id: 'q1', prompt: 'First?', answerFormat: AnswerFormat.freeInput() }),
      Question.create({ id: 'q2', prompt: 'Second?', answerFormat: AnswerFormat.freeInput() }),
    ];
    const listQuestions = new ListQuestions(fakeRepository(questions));

    const result = await listQuestions.execute();

    assert.deepEqual(result, questions);
  });

  test('returns an empty list when there are no questions', async () => {
    const listQuestions = new ListQuestions(fakeRepository([]));

    assert.deepEqual(await listQuestions.execute(), []);
  });
});
