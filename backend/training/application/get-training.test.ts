import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GetTraining } from './get-training.js';
import { Training } from 'domain/training';
import type { TrainingRepository } from './ports.js';

function fakeRepository(training: Training | null): TrainingRepository {
  return {
    async findById() { return training; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  } as unknown as TrainingRepository;
}

describe('GetTraining', () => {
  test('returns the training when found', async () => {
    const training = Training.schedule({ id: 't1', title: 'Onboarding', dateTime: new Date('2026-09-01T10:00:00.000Z'), trainerId: 'trainer1' });
    const getTraining = new GetTraining(fakeRepository(training));

    const result = await getTraining.execute({ trainingId: 't1' });

    assert.equal(result, training);
  });

  test('throws NOT_FOUND when no training has that id', async () => {
    const getTraining = new GetTraining(fakeRepository(null));

    await assert.rejects(
      () => getTraining.execute({ trainingId: 'missing' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });
});
