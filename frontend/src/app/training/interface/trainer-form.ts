import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { TrainersStore } from '@app/training/application/trainers.store';

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | null;
    return body?.error ?? err.statusText ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

@Component({
  selector: 'app-trainer-form',
  imports: [FormsModule, InputText, Button, Message],
  templateUrl: './trainer-form.html',
  styleUrl: './trainer-form.css',
})
export class TrainerForm {
  private readonly store = inject(TrainersStore);

  readonly name = signal('');
  readonly submitting = signal(false);
  readonly status = signal<string | null>(null);

  readonly statusSeverity = computed(() => (this.status()?.startsWith('Failed') ? 'error' : 'success'));

  submit(): void {
    const name = this.name();
    if (this.submitting() || !name) return;

    this.status.set('Saving...');
    this.submitting.set(true);
    this.store.create({ name }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.status.set('Trainer created.');
        this.resetForm();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.status.set(`Failed: ${extractErrorMessage(err)}`);
      },
    });
  }

  private resetForm(): void {
    this.name.set('');
  }
}
