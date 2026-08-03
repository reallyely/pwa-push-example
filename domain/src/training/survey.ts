export interface SurveyQuestion {
  questionId: string;
  parameterValues: Record<string, string>;
}

export interface Resource {
  id: string;
  url: string;
}

interface SurveyProps {
  id: string;
  trainingId: string;
  sendDate: Date;
  questions?: SurveyQuestion[];
  resources?: Resource[];
}

interface ScheduleSurveyInput {
  id: string;
  trainingId: string;
  sendDate: Date;
}

export class Survey {
  id: string;
  trainingId: string;
  sendDate: Date;
  questions: SurveyQuestion[];
  resources: Resource[];

  constructor({ id, trainingId, sendDate, questions = [], resources = [] }: SurveyProps) {
    this.id = id;
    this.trainingId = trainingId;
    this.sendDate = sendDate;
    this.questions = questions;
    this.resources = resources;
  }

  // The only creation path.
  static schedule({ id, trainingId, sendDate }: ScheduleSurveyInput): Survey {
    if (!id) throw new Error('Survey requires an id');
    if (!trainingId) throw new Error('Survey requires a trainingId');
    if (!(sendDate instanceof Date) || isNaN(sendDate.getTime())) {
      throw new Error('Survey requires a valid sendDate');
    }
    return new Survey({ id, trainingId, sendDate });
  }

  assignQuestion({ questionId, parameterValues }: SurveyQuestion): void {
    if (!questionId) throw new Error('Survey requires a questionId to assign a question');
    this.questions.push({ questionId, parameterValues });
  }

  attachResource({ id, url }: Resource): void {
    if (!id) throw new Error('Resource requires an id');
    if (!url || !url.trim()) throw new Error('Resource requires a non-empty url');
    this.resources.push({ id, url });
  }
}
