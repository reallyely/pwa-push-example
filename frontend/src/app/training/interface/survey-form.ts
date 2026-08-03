import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { SurveysStore } from '@app/training/application/surveys.store';
import type { QuestionView } from '@app/training/application/ports';

interface QuestionAssignment {
  questionId: string;
  parameterValues: Record<string, string>;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | null;
    return body?.error ?? err.statusText ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

@Component({
  selector: 'app-survey-form',
  imports: [FormsModule, InputText, Select, DatePicker, Button, Message],
  templateUrl: './survey-form.html',
  styleUrl: './survey-form.css',
})
export class SurveyForm {
  private readonly store = inject(SurveysStore);

  readonly trainingOptions = input.required<{ label: string; value: string }[]>();
  readonly questionOptions = input.required<QuestionView[]>();

  readonly trainingId = signal('');
  readonly sendDate = signal<Date | null>(null);
  readonly assignments = signal<QuestionAssignment[]>([]);
  readonly resourceUrls = signal<string[]>([]);
  readonly submitting = signal(false);
  readonly status = signal<string | null>(null);

  readonly pendingQuestionId = signal('');
  readonly pendingParameterValues = signal<Record<string, string>>({});

  readonly questionPickerOptions = computed(() =>
    this.questionOptions().map((question) => ({ label: question.prompt, value: question.id })),
  );

  readonly pendingQuestion = computed(() =>
    this.questionOptions().find((question) => question.id === this.pendingQuestionId()) ?? null,
  );

  readonly statusSeverity = computed(() => (this.status()?.startsWith('Failed') ? 'error' : 'success'));

  selectPendingQuestion(questionId: string): void {
    this.pendingQuestionId.set(questionId);
    this.pendingParameterValues.set({});
  }

  updatePendingParameterValue(name: string, value: string): void {
    this.pendingParameterValues.set({ ...this.pendingParameterValues(), [name]: value });
  }

  addQuestion(): void {
    const questionId = this.pendingQuestionId();
    if (!questionId) return;
    this.assignments.set([...this.assignments(), { questionId, parameterValues: this.pendingParameterValues() }]);
    this.pendingQuestionId.set('');
    this.pendingParameterValues.set({});
  }

  removeQuestion(index: number): void {
    this.assignments.set(this.assignments().filter((_, i) => i !== index));
  }

  questionLabel(questionId: string): string {
    return this.questionOptions().find((question) => question.id === questionId)?.prompt ?? questionId;
  }

  parameterValuesSummary(assignment: QuestionAssignment): string {
    const entries = Object.entries(assignment.parameterValues);
    if (entries.length === 0) return '';
    return entries.map(([name, value]) => `${name}=${value}`).join(', ');
  }

  updateResourceUrl(index: number, value: string): void {
    const urls = [...this.resourceUrls()];
    urls[index] = value;
    this.resourceUrls.set(urls);
  }

  addResourceUrl(): void {
    this.resourceUrls.set([...this.resourceUrls(), '']);
  }

  removeResourceUrl(index: number): void {
    this.resourceUrls.set(this.resourceUrls().filter((_, i) => i !== index));
  }

  submit(): void {
    const trainingId = this.trainingId();
    const sendDate = this.sendDate();
    if (this.submitting() || !trainingId || !sendDate) return;

    this.status.set('Saving...');
    this.submitting.set(true);
    this.store
      .create({
        trainingId,
        sendDate: sendDate.toISOString(),
        questionAssignments: this.assignments(),
        resources: this.resourceUrls()
          .map((url) => url.trim())
          .filter(Boolean)
          .map((url) => ({ url })),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.status.set('Survey created.');
          this.resetForm();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.status.set(`Failed: ${extractErrorMessage(err)}`);
        },
      });
  }

  private resetForm(): void {
    this.trainingId.set('');
    this.sendDate.set(null);
    this.assignments.set([]);
    this.resourceUrls.set([]);
    this.pendingQuestionId.set('');
    this.pendingParameterValues.set({});
  }
}
