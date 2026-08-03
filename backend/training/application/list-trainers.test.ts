import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ListTrainers } from './list-trainers.js';
import { Trainer } from 'domain/training';
import type { TrainerRepository } from './ports.js';

function fakeRepository(trainers: Trainer[]): TrainerRepository {
  return {
    async findById() { throw new Error('not used in this test'); },
    async findAll() { return trainers; },
    async save() { throw new Error('not used in this test'); },
  } as unknown as TrainerRepository;
}

describe('ListTrainers', () => {
  test('returns everything the repository has', async () => {
    const trainers = [
      Trainer.create({ id: 't1', name: 'Jamie Rivera' }),
      Trainer.create({ id: 't2', name: 'Alex Kim' }),
    ];
    const listTrainers = new ListTrainers(fakeRepository(trainers));

    const result = await listTrainers.execute();

    assert.deepEqual(result, trainers);
  });

  test('returns an empty list when there are no trainers', async () => {
    const listTrainers = new ListTrainers(fakeRepository([]));

    assert.deepEqual(await listTrainers.execute(), []);
  });
});
