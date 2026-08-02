import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AnswerFormat } from './answer-format.ts';

describe('AnswerFormat.freeInput', () => {
  test('has kind FreeInput and no extra data', () => {
    assert.deepEqual(AnswerFormat.freeInput(), { kind: 'FreeInput' });
  });
});

describe('AnswerFormat.likert', () => {
  test('accepts an ordered scale of at least 2 points', () => {
    const format = AnswerFormat.likert(['Strongly Disagree', 'Neutral', 'Strongly Agree']);
    assert.equal(format.kind, 'Likert');
    assert.deepEqual(format.scale, ['Strongly Disagree', 'Neutral', 'Strongly Agree']);
  });

  test('rejects fewer than 2 points', () => {
    assert.throws(() => AnswerFormat.likert(['Only one']));
  });

  test('rejects empty point labels', () => {
    assert.throws(() => AnswerFormat.likert(['Agree', '  ']));
  });
});

describe('AnswerFormat.choice', () => {
  test('accepts at least 2 unique options and an allowMultiple flag', () => {
    const format = AnswerFormat.choice(['Red', 'Blue'], false);
    assert.equal(format.kind, 'Choice');
    assert.deepEqual(format.options, ['Red', 'Blue']);
    assert.equal(format.allowMultiple, false);
  });

  test('rejects fewer than 2 options', () => {
    assert.throws(() => AnswerFormat.choice(['Only one'], false));
  });

  test('rejects duplicate options', () => {
    assert.throws(() => AnswerFormat.choice(['Red', 'Red'], false));
  });

  test('rejects empty option labels', () => {
    assert.throws(() => AnswerFormat.choice(['Red', '  '], false));
  });
});
