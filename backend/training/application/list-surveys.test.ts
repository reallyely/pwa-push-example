import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ListSurveys } from './list-surveys.js';
import { Survey } from 'domain/training';
import type { SurveyRepository } from './ports.js';

function fakeRepository(surveys: Survey[]): SurveyRepository {
  return {
    async findById() { throw new Error('not used in this test'); },
    async findAll() { return surveys; },
    async save() { throw new Error('not used in this test'); },
  } as unknown as SurveyRepository;
}

describe('ListSurveys', () => {
  test('returns everything the repository has', async () => {
    const surveys = [
      Survey.schedule({ id: 's1', trainingId: 't1', sendDate: new Date('2026-09-01T10:00:00.000Z') }),
      Survey.schedule({ id: 's2', trainingId: 't1', sendDate: new Date('2026-09-08T10:00:00.000Z') }),
    ];
    const listSurveys = new ListSurveys(fakeRepository(surveys));

    const result = await listSurveys.execute();

    assert.deepEqual(result, surveys);
  });

  test('returns an empty list when there are no surveys', async () => {
    const listSurveys = new ListSurveys(fakeRepository([]));

    assert.deepEqual(await listSurveys.execute(), []);
  });
});
