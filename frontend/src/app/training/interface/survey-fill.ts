import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { Question } from 'domain/training';
import { SurveysStore } from '@app/training/application/surveys.store';
import { QuestionsStore } from '@app/training/application/questions.store';
import { SurveyResponseStore } from '@app/training/application/survey-response.store';
import type { QuestionView, SurveyQuestionView, AnswerView } from '@app/training/application/ports';

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | null;
    return body?.error ?? err.statusText ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

@Component({
  selector: 'app-survey-fill',
  imports: [FormsModule, DatePipe, Textarea, Select, Checkbox, Button, Message],
  templateUrl: './survey-fill.html',
  styleUrl: './survey-fill.css',
})
export class SurveyFill implements OnInit {
  private readonly surveysStore = inject(SurveysStore);
  private readonly questionsStore = inject(QuestionsStore);
  private readonly responseStore = inject(SurveyResponseStore);

  readonly surveyId = input.required<string>();

  protected readonly answers = signal<Record<string, string | string[]>>({});
  protected readonly submitting = signal(false);
  protected readonly status = signal<string | null>(null);

  protected readonly survey = computed(() => this.surveysStore.surveys().find((survey) => survey.id === this.surveyId()) ?? null);
  protected readonly response = this.responseStore.current;
  protected readonly isFinished = computed(() => this.response()?.status === 'Finished');
  protected readonly statusSeverity = computed(() => (this.status()?.startsWith('Failed') ? 'error' : 'success'));

  ngOnInit(): void {
    this.surveysStore.load().subscribe();
    this.questionsStore.load().subscribe();
    this.responseStore.open(this.surveyId()).subscribe();
  }

  protected questionFor(questionId: string): QuestionView | null {
    return this.questionsStore.questions().find((question) => question.id === questionId) ?? null;
  }

  // Reuses the real domain substitution rather than re-implementing the
  // placeholder regex here — unlike question-form.ts's client-side mirror,
  // there is a real Question instance with real parameterValues to call it
  // on at this point.
  protected renderedPrompt(surveyQuestion: SurveyQuestionView): string {
    const question = this.questionFor(surveyQuestion.questionId);
    if (!question) return '';
    try {
      return Question.create({ id: question.id, prompt: question.prompt, answerFormat: question.answerFormat }).renderPrompt(
        surveyQuestion.parameterValues,
      );
    } catch {
      return question.prompt;
    }
  }

  protected likertScale(question: QuestionView): string[] {
    return question.answerFormat.kind === 'Likert' ? question.answerFormat.scale : [];
  }

  protected choiceOptions(question: QuestionView): string[] {
    return question.answerFormat.kind === 'Choice' ? question.answerFormat.options : [];
  }

  protected allowsMultiple(question: QuestionView): boolean {
    return question.answerFormat.kind === 'Choice' && question.answerFormat.allowMultiple;
  }

  protected answerValue(questionId: string): string {
    const value = this.answers()[questionId];
    return typeof value === 'string' ? value : '';
  }

  protected isOptionSelected(questionId: string, option: string): boolean {
    const value = this.answers()[questionId];
    return Array.isArray(value) && value.includes(option);
  }

  protected setAnswer(questionId: string, value: string): void {
    this.answers.set({ ...this.answers(), [questionId]: value });
  }

  protected toggleChoiceOption(questionId: string, option: string, checked: boolean): void {
    const current = this.answers()[questionId];
    const values = Array.isArray(current) ? current : [];
    const next = checked ? [...values, option] : values.filter((value) => value !== option);
    this.answers.set({ ...this.answers(), [questionId]: next });
  }

  protected accessResource(resourceId: string): void {
    this.responseStore.recordResourceAccess(resourceId).subscribe();
  }

  protected submit(): void {
    if (this.submitting() || this.isFinished()) return;

    const answers: AnswerView[] = Object.entries(this.answers())
      .filter(([, value]) => (Array.isArray(value) ? value.length > 0 : value !== ''))
      .map(([questionId, value]) => ({ questionId, value }));

    this.status.set('Submitting...');
    this.submitting.set(true);
    this.responseStore.submit(answers).subscribe({
      next: () => {
        this.submitting.set(false);
        this.status.set('Survey submitted.');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.status.set(`Failed: ${extractErrorMessage(err)}`);
      },
    });
  }
}
