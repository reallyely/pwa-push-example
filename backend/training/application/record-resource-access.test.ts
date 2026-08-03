import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RecordResourceAccess } from './record-resource-access.js';
import { SurveyResponse } from 'domain/training';
import type { SurveyResponseRepository } from './ports.js';

function fakeRepository(surveyResponse: SurveyResponse | null): SurveyResponseRepository & { saved: SurveyResponse[] } {
  const saved: SurveyResponse[] = [];
  const repository = {
    async findById() { return surveyResponse; },
    async findBySurveyAndUser() { throw new Error('not used in this test'); },
    async findBySurveyId() { throw new Error('not used in this test'); },
    async save(response: SurveyResponse) { saved.push(response); },
  };
  return Object.assign(repository, { saved }) as unknown as SurveyResponseRepository & { saved: SurveyResponse[] };
}

describe('RecordResourceAccess', () => {
  test('appends a ResourceAccess and saves', async () => {
    const surveyResponse = SurveyResponse.open({ id: 'sr1', surveyId: 's1', userId: 'u1', now: new Date() });
    const repository = fakeRepository(surveyResponse);
    const recordResourceAccess = new RecordResourceAccess(repository);

    await recordResourceAccess.execute({ surveyResponseId: 'sr1', resourceId: 'r1' });

    assert.equal(surveyResponse.resourceAccesses.length, 1);
    assert.equal(surveyResponse.resourceAccesses[0].resourceId, 'r1');
    assert.equal(repository.saved.length, 1);
  });

  test('throws NOT_FOUND when no survey response has that id', async () => {
    const recordResourceAccess = new RecordResourceAccess(fakeRepository(null));

    await assert.rejects(
      () => recordResourceAccess.execute({ surveyResponseId: 'missing', resourceId: 'r1' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });
});
