import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { QuestionsStore } from '@app/training/application/questions.store';
import type { AnswerFormatRequest } from '@app/training/application/ports';

type AnswerType = 'FreeInput' | 'Likert' | 'Choice';

const PARAMETER_PATTERN = /<([a-zA-Z][\w-]*)>/g;

function extractParameterNames(prompt: string): string[] {
  const names: string[] = [];
  for (const match of prompt.matchAll(PARAMETER_PATTERN)) {
    const name = match[1];
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | null;
    return body?.error ?? err.statusText ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

@Component({
  selector: 'app-question-form',
  imports: [FormsModule, InputText, Textarea, Select, Checkbox, Button, Message],
  templateUrl: './question-form.html',
  styleUrl: './question-form.css',
})
export class QuestionForm {
  private readonly store = inject(QuestionsStore);

  readonly answerTypeOptions: { label: string; value: AnswerType }[] = [
    { label: 'Free input', value: 'FreeInput' },
    { label: 'Likert scale', value: 'Likert' },
    { label: 'Choice', value: 'Choice' },
  ];

  readonly prompt = signal('');
  readonly answerType = signal<AnswerType>('FreeInput');
  readonly scalePoints = signal<string[]>(['', '']);
  readonly choiceOptions = signal<string[]>(['', '']);
  readonly allowMultiple = signal(false);
  readonly submitting = signal(false);
  readonly status = signal<string | null>(null);

  readonly parameterNames = computed(() => extractParameterNames(this.prompt()));
  readonly statusSeverity = computed(() => (this.status()?.startsWith('Failed') ? 'error' : 'success'));

  updateScalePoint(index: number, value: string): void {
    const points = [...this.scalePoints()];
    points[index] = value;
    this.scalePoints.set(points);
  }

  addScalePoint(): void {
    this.scalePoints.set([...this.scalePoints(), '']);
  }

  removeScalePoint(index: number): void {
    this.scalePoints.set(this.scalePoints().filter((_, i) => i !== index));
  }

  updateChoiceOption(index: number, value: string): void {
    const options = [...this.choiceOptions()];
    options[index] = value;
    this.choiceOptions.set(options);
  }

  addChoiceOption(): void {
    this.choiceOptions.set([...this.choiceOptions(), '']);
  }

  removeChoiceOption(index: number): void {
    this.choiceOptions.set(this.choiceOptions().filter((_, i) => i !== index));
  }

  submit(): void {
    if (this.submitting() || !this.prompt().trim()) return;

    this.status.set('Saving...');
    this.submitting.set(true);
    this.store.create({ prompt: this.prompt(), answerFormat: this.buildAnswerFormat() }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.status.set('Question created.');
        this.resetForm();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.status.set(`Failed: ${extractErrorMessage(err)}`);
      },
    });
  }

  private buildAnswerFormat(): AnswerFormatRequest {
    switch (this.answerType()) {
      case 'Likert':
        return { kind: 'Likert', scale: this.scalePoints().map((p) => p.trim()).filter(Boolean) };
      case 'Choice':
        return {
          kind: 'Choice',
          options: this.choiceOptions().map((o) => o.trim()).filter(Boolean),
          allowMultiple: this.allowMultiple(),
        };
      default:
        return { kind: 'FreeInput' };
    }
  }

  private resetForm(): void {
    this.prompt.set('');
    this.answerType.set('FreeInput');
    this.scalePoints.set(['', '']);
    this.choiceOptions.set(['', '']);
    this.allowMultiple.set(false);
  }
}
