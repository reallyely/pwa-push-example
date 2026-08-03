import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CreateTraining } from './create-training.js';
import type { Training } from 'domain/training';
import type { TrainingRepository } from './ports.js';

function fakeRepository(): TrainingRepository & { saved: Training[] } {
  const saved: Training[] = [];
  const repository = {
    async findById() { throw new Error('not used in this test'); },
    async findAll() { throw new Error('not used in this test'); },
    async save(training: Training) { saved.push(training); },
  };
  return Object.assign(repository, { saved }) as unknown as TrainingRepository & { saved: Training[] };
}

describe('CreateTraining', () => {
  test('schedules a training', async () => {
    const repository = fakeRepository();
    const createTraining = new CreateTraining(repository, () => 't1');

    const result = await createTraining.execute({
      title: 'Onboarding',
      dateTime: '2026-09-01T10:00:00.000Z',
      trainerId: 'trainer1',
    });

    assert.equal(result.trainingId, 't1');
    assert.equal(repository.saved.length, 1);
    assert.equal(repository.saved[0].title, 'Onboarding');
    assert.equal(repository.saved[0].trainerId, 'trainer1');
    assert.equal(repository.saved[0].dateTime.toISOString(), '2026-09-01T10:00:00.000Z');
  });

  test('accepts an optional description', async () => {
    const repository = fakeRepository();
    const createTraining = new CreateTraining(repository, () => 't1');

    await createTraining.execute({
      title: 'Onboarding',
      description: 'Covers the basics',
      dateTime: '2026-09-01T10:00:00.000Z',
      trainerId: 'trainer1',
    });

    assert.equal(repository.saved[0].description, 'Covers the basics');
  });

  test('rejects a missing title', async () => {
    const repository = fakeRepository();
    const createTraining = new CreateTraining(repository, () => 't2');

    await assert.rejects(() =>
      createTraining.execute({
        title: '',
        dateTime: '2026-09-01T10:00:00.000Z',
        trainerId: 'trainer1',
      }),
    );
    assert.equal(repository.saved.length, 0);
  });

  test('rejects an invalid dateTime', async () => {
    const repository = fakeRepository();
    const createTraining = new CreateTraining(repository, () => 't2');

    await assert.rejects(() =>
      createTraining.execute({
        title: 'Onboarding',
        dateTime: 'not-a-date',
        trainerId: 'trainer1',
      }),
    );
    assert.equal(repository.saved.length, 0);
  });
});
