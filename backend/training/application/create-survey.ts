import { Survey } from 'domain/training';
import type { TrainingRepository, QuestionRepository, SurveyRepository, GenerateId } from './ports.js';
import { trainingError } from './errors.js';

interface QuestionAssignmentRequest {
  questionId: string;
  parameterValues: Record<string, string>;
}

interface ResourceRequest {
  url: string;
}

interface CreateSurveyRequest {
  trainingId: string;
  sendDate: string;
  questionAssignments: QuestionAssignmentRequest[];
  resources: ResourceRequest[];
}

interface CreateSurveyResponse {
  surveyId: string;
}

export class CreateSurvey {
  constructor(
    private trainingRepository: TrainingRepository,
    private questionRepository: QuestionRepository,
    private surveyRepository: SurveyRepository,
    private generateId: GenerateId,
  ) {}

  async execute({ trainingId, sendDate, questionAssignments, resources }: CreateSurveyRequest): Promise<CreateSurveyResponse> {
    const training = await this.trainingRepository.findById(trainingId);
    if (!training) {
      throw trainingError('no such training', 'NOT_FOUND');
    }

    const survey = Survey.schedule({
      id: this.generateId(),
      trainingId,
      sendDate: new Date(sendDate),
    });

    for (const assignment of questionAssignments) {
      const question = await this.questionRepository.findById(assignment.questionId);
      if (!question) {
        throw trainingError('no such question', 'NOT_FOUND');
      }
      // Purely to validate the parameter binding before it's stored —
      // Survey never keeps the rendered text, only the raw parameterValues.
      question.renderPrompt(assignment.parameterValues);
      survey.assignQuestion({ questionId: assignment.questionId, parameterValues: assignment.parameterValues });
    }

    for (const resource of resources) {
      survey.attachResource({ id: this.generateId(), url: resource.url });
    }

    await this.surveyRepository.save(survey);
    return { surveyId: survey.id };
  }
}
