import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ListSurveyResponses } from './list-survey-responses.js';
import { SurveyResponse } from 'domain/training';
import type { SurveyResponseRepository } from './ports.js';

function fakeRepository(responses: SurveyResponse[]): SurveyResponseRepository {
  return {
    async findById() { throw new Error('not used in this test'); },
    async findBySurveyAndUser() { throw new Error('not used in this test'); },
    async findBySurveyId() { return responses; },
    async save() { throw new Error('not used in this test'); },
  } as unknown as SurveyResponseRepository;
}

describe('ListSurveyResponses', () => {
  test('returns every response for the survey, any state', async () => {
    const responses = [
      SurveyResponse.open({ id: 'sr1', surveyId: 's1', userId: 'u1', now: new Date() }),
      SurveyResponse.open({ id: 'sr2', surveyId: 's1', userId: 'u2', now: new Date() }),
    ];
    responses[1].finish([], new Date());
    const listSurveyResponses = new ListSurveyResponses(fakeRepository(responses));

    const result = await listSurveyResponses.execute({ surveyId: 's1' });

    assert.deepEqual(result, responses);
  });

  test('returns an empty list when there are no responses', async () => {
    const listSurveyResponses = new ListSurveyResponses(fakeRepository([]));

    assert.deepEqual(await listSurveyResponses.execute({ surveyId: 's1' }), []);
  });
});
