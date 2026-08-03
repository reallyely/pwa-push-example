import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Survey } from './survey.ts';

function validSurvey(overrides = {}) {
  return {
    id: 's1',
    trainingId: 't1',
    sendDate: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('Survey.schedule', () => {
  test('requires an id', () => {
    assert.throws(() => Survey.schedule(validSurvey({ id: '' })));
  });

  test('requires a trainingId', () => {
    assert.throws(() => Survey.schedule(validSurvey({ trainingId: '' })));
  });

  test('requires a valid sendDate', () => {
    assert.throws(() => Survey.schedule(validSurvey({ sendDate: new Date('not-a-date') })));
  });

  test('requires a sendDate to be a Date', () => {
    assert.throws(() => Survey.schedule(validSurvey({ sendDate: '2026-09-01T10:00:00.000Z' as unknown as Date })));
  });

  test('schedules a survey with no questions or resources yet', () => {
    const survey = Survey.schedule(validSurvey());
    assert.equal(survey.id, 's1');
    assert.equal(survey.trainingId, 't1');
    assert.equal(survey.sendDate.toISOString(), '2026-09-01T10:00:00.000Z');
    assert.deepEqual(survey.questions, []);
    assert.deepEqual(survey.resources, []);
  });
});

describe('Survey#assignQuestion', () => {
  test('requires a questionId', () => {
    const survey = Survey.schedule(validSurvey());
    assert.throws(() => survey.assignQuestion({ questionId: '', parameterValues: {} }));
  });

  test('appends the assignment', () => {
    const survey = Survey.schedule(validSurvey());
    survey.assignQuestion({ questionId: 'q1', parameterValues: {} });
    survey.assignQuestion({ questionId: 'q2', parameterValues: { skill: 'TypeScript' } });
    assert.deepEqual(survey.questions, [
      { questionId: 'q1', parameterValues: {} },
      { questionId: 'q2', parameterValues: { skill: 'TypeScript' } },
    ]);
  });
});

describe('Survey#attachResource', () => {
  test('requires an id', () => {
    const survey = Survey.schedule(validSurvey());
    assert.throws(() => survey.attachResource({ id: '', url: 'https://example.com' }));
  });

  test('requires a non-empty url', () => {
    const survey = Survey.schedule(validSurvey());
    assert.throws(() => survey.attachResource({ id: 'r1', url: '  ' }));
  });

  test('appends the resource', () => {
    const survey = Survey.schedule(validSurvey());
    survey.attachResource({ id: 'r1', url: 'https://example.com/handout.pdf' });
    assert.deepEqual(survey.resources, [{ id: 'r1', url: 'https://example.com/handout.pdf' }]);
  });
});
