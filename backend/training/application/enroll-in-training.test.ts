import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EnrollInTraining } from './enroll-in-training.js';
import { Training } from 'domain/training';
import type { TrainingRepository, TrainingEnrollmentRepository } from './ports.js';

function fakeTrainingRepository(training: Training | null): TrainingRepository {
  return {
    async findById() { return training; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  } as unknown as TrainingRepository;
}

function fakeEnrollmentRepository(): TrainingEnrollmentRepository & { enrolled: { trainingId: string; userId: string }[] } {
  const enrolled: { trainingId: string; userId: string }[] = [];
  const repository = {
    async enroll(trainingId: string, userId: string) { enrolled.push({ trainingId, userId }); },
    async findTrainingIdsByUser() { throw new Error('not used in this test'); },
    async findUserIdsByTraining() { throw new Error('not used in this test'); },
  };
  return Object.assign(repository, { enrolled }) as unknown as TrainingEnrollmentRepository & {
    enrolled: { trainingId: string; userId: string }[];
  };
}

describe('EnrollInTraining', () => {
  test('enrolls the user in an existing training', async () => {
    const training = Training.schedule({ id: 't1', title: 'Onboarding', dateTime: new Date('2026-09-01T10:00:00.000Z'), trainerId: 'trainer1' });
    const enrollmentRepository = fakeEnrollmentRepository();
    const enrollInTraining = new EnrollInTraining(fakeTrainingRepository(training), enrollmentRepository);

    await enrollInTraining.execute({ userId: 'u1', trainingId: 't1' });

    assert.deepEqual(enrollmentRepository.enrolled, [{ trainingId: 't1', userId: 'u1' }]);
  });

  test('throws NOT_FOUND when no training has that id', async () => {
    const enrollmentRepository = fakeEnrollmentRepository();
    const enrollInTraining = new EnrollInTraining(fakeTrainingRepository(null), enrollmentRepository);

    await assert.rejects(
      () => enrollInTraining.execute({ userId: 'u1', trainingId: 'missing' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
    assert.equal(enrollmentRepository.enrolled.length, 0);
  });
});
