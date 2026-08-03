import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { TrainingsStore } from '@app/training/application/trainings.store';

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | null;
    return body?.error ?? err.statusText ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

@Component({
  selector: 'app-training-form',
  imports: [FormsModule, InputText, Textarea, Select, DatePicker, Button, Message],
  templateUrl: './training-form.html',
  styleUrl: './training-form.css',
})
export class TrainingForm {
  private readonly store = inject(TrainingsStore);

  readonly trainerOptions = input.required<{ label: string; value: string }[]>();

  readonly title = signal('');
  readonly description = signal('');
  readonly dateTime = signal<Date | null>(null);
  readonly trainerId = signal('');
  readonly submitting = signal(false);
  readonly status = signal<string | null>(null);

  readonly statusSeverity = computed(() => (this.status()?.startsWith('Failed') ? 'error' : 'success'));

  submit(): void {
    const title = this.title();
    const dateTime = this.dateTime();
    const trainerId = this.trainerId();
    if (this.submitting() || !title || !dateTime || !trainerId) return;

    this.status.set('Saving...');
    this.submitting.set(true);
    this.store.create({ title, description: this.description() || undefined, dateTime: dateTime.toISOString(), trainerId }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.status.set('Training created.');
        this.resetForm();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.status.set(`Failed: ${extractErrorMessage(err)}`);
      },
    });
  }

  private resetForm(): void {
    this.title.set('');
    this.description.set('');
    this.dateTime.set(null);
    this.trainerId.set('');
  }
}
