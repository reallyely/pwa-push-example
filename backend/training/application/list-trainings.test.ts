import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ListTrainings } from './list-trainings.js';
import { Training } from 'domain/training';
import type { TrainingRepository } from './ports.js';

function fakeRepository(trainings: Training[]): TrainingRepository {
  return {
    async findById() { throw new Error('not used in this test'); },
    async findAll() { return trainings; },
    async save() { throw new Error('not used in this test'); },
  } as unknown as TrainingRepository;
}

describe('ListTrainings', () => {
  test('returns everything the repository has', async () => {
    const trainings = [
      Training.schedule({ id: 't1', title: 'Onboarding', dateTime: new Date('2026-09-01T10:00:00.000Z'), trainerId: 'trainer1' }),
      Training.schedule({ id: 't2', title: 'Advanced', dateTime: new Date('2026-09-02T10:00:00.000Z'), trainerId: 'trainer2' }),
    ];
    const listTrainings = new ListTrainings(fakeRepository(trainings));

    const result = await listTrainings.execute();

    assert.deepEqual(result, trainings);
  });

  test('returns an empty list when there are no trainings', async () => {
    const listTrainings = new ListTrainings(fakeRepository([]));

    assert.deepEqual(await listTrainings.execute(), []);
  });
});
