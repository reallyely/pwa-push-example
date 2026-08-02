import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Question } from './question.ts';
import { AnswerFormat } from './answer-format.ts';

function validQuestion(overrides = {}) {
  return {
    id: 'q1',
    prompt: 'How confident are you in this training?',
    answerFormat: AnswerFormat.freeInput(),
    ...overrides,
  };
}

describe('Question.create', () => {
  test('requires an id', () => {
    assert.throws(() => Question.create(validQuestion({ id: '' })));
  });

  test('requires a non-empty prompt', () => {
    assert.throws(() => Question.create(validQuestion({ prompt: '  ' })));
  });

  test('requires an answerFormat', () => {
    assert.throws(() => Question.create(validQuestion({ answerFormat: undefined })));
  });

  test('creates a FreeInput question', () => {
    const question = Question.create(validQuestion());
    assert.equal(question.answerFormat.kind, 'FreeInput');
  });

  test('creates a Likert question with an author-configured scale', () => {
    const question = Question.create(
      validQuestion({ answerFormat: AnswerFormat.likert(['Disagree', 'Neutral', 'Agree']) }),
    );
    assert.equal(question.answerFormat.kind, 'Likert');
  });

  test('creates a Choice question with author-decided cardinality', () => {
    const question = Question.create(
      validQuestion({ answerFormat: AnswerFormat.choice(['Red', 'Blue'], true) }),
    );
    assert.equal(question.answerFormat.kind, 'Choice');
  });
});

describe('Question#parameterNames / isParameterized', () => {
  test('a plain prompt has no parameters', () => {
    const question = Question.create(validQuestion());
    assert.deepEqual(question.parameterNames, []);
    assert.equal(question.isParameterized, false);
  });

  test('extracts a single placeholder', () => {
    const question = Question.create(validQuestion({ prompt: 'I use <skill> every day' }));
    assert.deepEqual(question.parameterNames, ['skill']);
    assert.equal(question.isParameterized, true);
  });

  test('extracts multiple, deduplicated, in first-appearance order', () => {
    const question = Question.create(
      validQuestion({ prompt: 'I use <skill> for <duration>, and <skill> helps me most with <duration>' }),
    );
    assert.deepEqual(question.parameterNames, ['skill', 'duration']);
  });
});

describe('Question#renderPrompt', () => {
  test('substitutes every declared parameter', () => {
    const question = Question.create(
      validQuestion({ prompt: 'I use <skill> for <duration> every day' }),
    );
    assert.equal(
      question.renderPrompt({ skill: 'TypeScript', duration: '2 hours' }),
      'I use TypeScript for 2 hours every day',
    );
  });

  test('throws when a declared parameter has no value', () => {
    const question = Question.create(validQuestion({ prompt: 'I use <skill> every day' }));
    assert.throws(
      () => question.renderPrompt({}),
      (err: any) => err.code === 'MISSING_PARAMETER_VALUES',
    );
  });

  test('throws when given a value for a parameter the prompt does not declare', () => {
    const question = Question.create(validQuestion({ prompt: 'I use <skill> every day' }));
    assert.throws(
      () => question.renderPrompt({ skill: 'TypeScript', duration: '2 hours' }),
      (err: any) => err.code === 'UNEXPECTED_PARAMETER_VALUES',
    );
  });

  test('is a no-op substitution for a non-parameterized prompt with no values', () => {
    const question = Question.create(validQuestion());
    assert.equal(question.renderPrompt({}), question.prompt);
  });
});
