import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CreateTrainer } from './create-trainer.js';
import type { Trainer } from 'domain/training';
import type { TrainerRepository } from './ports.js';

function fakeRepository(): TrainerRepository & { saved: Trainer[] } {
  const saved: Trainer[] = [];
  const repository = {
    async findById() { throw new Error('not used in this test'); },
    async findAll() { throw new Error('not used in this test'); },
    async save(trainer: Trainer) { saved.push(trainer); },
  };
  return Object.assign(repository, { saved }) as unknown as TrainerRepository & { saved: Trainer[] };
}

describe('CreateTrainer', () => {
  test('creates a Trainer', async () => {
    const repository = fakeRepository();
    const createTrainer = new CreateTrainer(repository, () => 't1');

    const result = await createTrainer.execute({ name: 'Jamie Rivera' });

    assert.equal(result.trainerId, 't1');
    assert.equal(repository.saved.length, 1);
    assert.equal(repository.saved[0].name, 'Jamie Rivera');
  });
});
