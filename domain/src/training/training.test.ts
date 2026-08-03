import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Training } from './training.ts';

function validTraining(overrides = {}) {
  return {
    id: 't1',
    title: 'Onboarding',
    dateTime: new Date('2026-09-01T10:00:00.000Z'),
    trainerId: 'trainer1',
    ...overrides,
  };
}

describe('Training.schedule', () => {
  test('requires an id', () => {
    assert.throws(() => Training.schedule(validTraining({ id: '' })));
  });

  test('requires a title', () => {
    assert.throws(() => Training.schedule(validTraining({ title: '' })));
  });

  test('requires a valid dateTime', () => {
    assert.throws(() => Training.schedule(validTraining({ dateTime: new Date('not-a-date') })));
  });

  test('requires a dateTime to be a Date', () => {
    assert.throws(() => Training.schedule(validTraining({ dateTime: '2026-09-01T10:00:00.000Z' as unknown as Date })));
  });

  test('requires a trainerId', () => {
    assert.throws(() => Training.schedule(validTraining({ trainerId: '' })));
  });

  test('schedules a training', () => {
    const training = Training.schedule(validTraining());
    assert.equal(training.id, 't1');
    assert.equal(training.title, 'Onboarding');
    assert.equal(training.description, undefined);
    assert.equal(training.trainerId, 'trainer1');
    assert.equal(training.dateTime.toISOString(), '2026-09-01T10:00:00.000Z');
  });

  test('accepts an optional description', () => {
    const training = Training.schedule(validTraining({ description: 'Covers the basics' }));
    assert.equal(training.description, 'Covers the basics');
  });
});
