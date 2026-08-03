import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GetMyEnrollment } from './get-my-enrollment.js';
import { BlackoutWindow } from 'domain/training';
import type { TrainingEnrollmentRepository, BlackoutWindowRepository } from './ports.js';

function fakeEnrollmentRepository(trainingIds: string[]): TrainingEnrollmentRepository {
  return {
    async enroll() { throw new Error('not used in this test'); },
    async findTrainingIdsByUser() { return trainingIds; },
    async findUserIdsByTraining() { throw new Error('not used in this test'); },
  } as unknown as TrainingEnrollmentRepository;
}

function fakeBlackoutWindowRepository(windows: BlackoutWindow[]): BlackoutWindowRepository {
  return {
    async findByUserId() { return windows; },
    async save() { throw new Error('not used in this test'); },
  } as unknown as BlackoutWindowRepository;
}

describe('GetMyEnrollment', () => {
  test('combines enrolled trainingIds and blackoutWindows for the user', async () => {
    const windows = [BlackoutWindow.between({ dayOfWeek: 'Monday', startTime: '06:00', endTime: '07:00' })];
    const getMyEnrollment = new GetMyEnrollment(fakeEnrollmentRepository(['t1', 't2']), fakeBlackoutWindowRepository(windows));

    const result = await getMyEnrollment.execute({ userId: 'u1' });

    assert.deepEqual(result.trainingIds, ['t1', 't2']);
    assert.deepEqual(result.blackoutWindows, windows);
  });

  test('returns empty lists when the user has neither', async () => {
    const getMyEnrollment = new GetMyEnrollment(fakeEnrollmentRepository([]), fakeBlackoutWindowRepository([]));

    const result = await getMyEnrollment.execute({ userId: 'u1' });

    assert.deepEqual(result, { trainingIds: [], blackoutWindows: [] });
  });
});
