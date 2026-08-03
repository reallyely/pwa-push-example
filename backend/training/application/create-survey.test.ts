import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CreateSurvey } from './create-survey.js';
import { Training, Question, AnswerFormat, Survey } from 'domain/training';
import type { TrainingRepository, QuestionRepository, SurveyRepository } from './ports.js';

function fakeTrainingRepository(training: Training | null): TrainingRepository {
  return {
    async findById() { return training; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  } as unknown as TrainingRepository;
}

function fakeQuestionRepository(questions: Question[]): QuestionRepository {
  return {
    async findById(id: string) { return questions.find((q) => q.id === id) ?? null; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  } as unknown as QuestionRepository;
}

function fakeSurveyRepository(): SurveyRepository & { saved: Survey[] } {
  const saved: Survey[] = [];
  const repository = {
    async findById() { throw new Error('not used in this test'); },
    async findAll() { throw new Error('not used in this test'); },
    async save(survey: Survey) { saved.push(survey); },
  };
  return Object.assign(repository, { saved }) as unknown as SurveyRepository & { saved: Survey[] };
}

function generateSequentialId(prefix: string): () => string {
  let count = 0;
  return () => `${prefix}${++count}`;
}

const training = Training.schedule({ id: 't1', title: 'Onboarding', dateTime: new Date('2026-09-01T10:00:00.000Z'), trainerId: 'trainer1' });

describe('CreateSurvey', () => {
  test('schedules a survey with no assignments or resources', async () => {
    const surveyRepository = fakeSurveyRepository();
    const createSurvey = new CreateSurvey(
      fakeTrainingRepository(training),
      fakeQuestionRepository([]),
      surveyRepository,
      generateSequentialId('s'),
    );

    const result = await createSurvey.execute({
      trainingId: 't1',
      sendDate: '2026-09-08T10:00:00.000Z',
      questionAssignments: [],
      resources: [],
    });

    assert.equal(result.surveyId, 's1');
    assert.equal(surveyRepository.saved.length, 1);
    assert.deepEqual(surveyRepository.saved[0].questions, []);
    assert.deepEqual(surveyRepository.saved[0].resources, []);
  });

  test('rejects when the training does not exist', async () => {
    const createSurvey = new CreateSurvey(
      fakeTrainingRepository(null),
      fakeQuestionRepository([]),
      fakeSurveyRepository(),
      generateSequentialId('s'),
    );

    await assert.rejects(
      () =>
        createSurvey.execute({
          trainingId: 'missing',
          sendDate: '2026-09-08T10:00:00.000Z',
          questionAssignments: [],
          resources: [],
        }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });

  test('rejects when an assigned question does not exist', async () => {
    const createSurvey = new CreateSurvey(
      fakeTrainingRepository(training),
      fakeQuestionRepository([]),
      fakeSurveyRepository(),
      generateSequentialId('s'),
    );

    await assert.rejects(
      () =>
        createSurvey.execute({
          trainingId: 't1',
          sendDate: '2026-09-08T10:00:00.000Z',
          questionAssignments: [{ questionId: 'missing', parameterValues: {} }],
          resources: [],
        }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });

  test('rejects a parameterized question missing a parameter value', async () => {
    const question = Question.create({ id: 'q1', prompt: 'I use <skill> every day', answerFormat: AnswerFormat.freeInput() });
    const createSurvey = new CreateSurvey(
      fakeTrainingRepository(training),
      fakeQuestionRepository([question]),
      fakeSurveyRepository(),
      generateSequentialId('s'),
    );

    await assert.rejects(
      () =>
        createSurvey.execute({
          trainingId: 't1',
          sendDate: '2026-09-08T10:00:00.000Z',
          questionAssignments: [{ questionId: 'q1', parameterValues: {} }],
          resources: [],
        }),
      (err: any) => err.code === 'MISSING_PARAMETER_VALUES',
    );
  });

  test('assigns questions and attaches resources', async () => {
    const question = Question.create({ id: 'q1', prompt: 'I use <skill> every day', answerFormat: AnswerFormat.freeInput() });
    const surveyRepository = fakeSurveyRepository();
    const createSurvey = new CreateSurvey(
      fakeTrainingRepository(training),
      fakeQuestionRepository([question]),
      surveyRepository,
      generateSequentialId('id'),
    );

    const result = await createSurvey.execute({
      trainingId: 't1',
      sendDate: '2026-09-08T10:00:00.000Z',
      questionAssignments: [{ questionId: 'q1', parameterValues: { skill: 'TypeScript' } }],
      resources: [{ url: 'https://example.com/handout.pdf' }],
    });

    const saved = surveyRepository.saved[0];
    assert.equal(result.surveyId, saved.id);
    assert.deepEqual(saved.questions, [{ questionId: 'q1', parameterValues: { skill: 'TypeScript' } }]);
    assert.equal(saved.resources.length, 1);
    assert.equal(saved.resources[0].url, 'https://example.com/handout.pdf');
    assert.ok(saved.resources[0].id);
  });
});
