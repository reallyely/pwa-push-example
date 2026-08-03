import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Trainer } from './trainer.ts';

function validTrainer(overrides = {}) {
  return {
    id: 't1',
    name: 'Jamie Rivera',
    ...overrides,
  };
}

describe('Trainer.create', () => {
  test('requires an id', () => {
    assert.throws(() => Trainer.create(validTrainer({ id: '' })));
  });

  test('requires a non-empty name', () => {
    assert.throws(() => Trainer.create(validTrainer({ name: '  ' })));
  });

  test('creates a Trainer', () => {
    const trainer = Trainer.create(validTrainer());
    assert.equal(trainer.id, 't1');
    assert.equal(trainer.name, 'Jamie Rivera');
  });
});
