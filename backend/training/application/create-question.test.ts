import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CreateQuestion } from './create-question.js';
import type { Question } from 'domain/training';
import type { QuestionRepository } from './ports.js';

function fakeRepository(): QuestionRepository & { saved: Question[] } {
  const saved: Question[] = [];
  const repository = {
    async findById() { throw new Error('not used in this test'); },
    async findAll() { throw new Error('not used in this test'); },
    async save(question: Question) { saved.push(question); },
  };
  return Object.assign(repository, { saved }) as unknown as QuestionRepository & { saved: Question[] };
}

describe('CreateQuestion', () => {
  test('creates a FreeInput question', async () => {
    const repository = fakeRepository();
    const createQuestion = new CreateQuestion(repository, () => 'q1');

    const result = await createQuestion.execute({
      prompt: 'How was your training?',
      answerFormat: { kind: 'FreeInput' },
    });

    assert.equal(result.questionId, 'q1');
    assert.equal(repository.saved.length, 1);
    assert.equal(repository.saved[0].answerFormat.kind, 'FreeInput');
  });

  test('creates a Likert question with an author-configured scale', async () => {
    const repository = fakeRepository();
    const createQuestion = new CreateQuestion(repository, () => 'q2');

    await createQuestion.execute({
      prompt: 'I feel confident applying this training.',
      answerFormat: { kind: 'Likert', scale: ['Disagree', 'Neutral', 'Agree'] },
    });

    assert.equal(repository.saved[0].answerFormat.kind, 'Likert');
  });

  test('creates a Choice question with author-decided cardinality', async () => {
    const repository = fakeRepository();
    const createQuestion = new CreateQuestion(repository, () => 'q3');

    await createQuestion.execute({
      prompt: 'Which topics were most useful?',
      answerFormat: { kind: 'Choice', options: ['Topic A', 'Topic B'], allowMultiple: true },
    });

    const saved = repository.saved[0];
    assert.equal(saved.answerFormat.kind, 'Choice');
    if (saved.answerFormat.kind === 'Choice') {
      assert.equal(saved.answerFormat.allowMultiple, true);
    }
  });

  test('rejects an unrecognized answerFormat kind', async () => {
    const repository = fakeRepository();
    const createQuestion = new CreateQuestion(repository, () => 'q4');

    await assert.rejects(
      () =>
        createQuestion.execute({
          prompt: 'Broken',
          answerFormat: { kind: 'Matching' } as any,
        }),
      (err: any) => err.code === 'INVALID_INPUT',
    );
    assert.equal(repository.saved.length, 0);
  });
});
