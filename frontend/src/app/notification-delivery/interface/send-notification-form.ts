import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminNotificationsStore } from '../application/admin-notifications.store';
import type { ScheduleNotificationRequest, SendNotificationRequest } from '../application/ports';

export interface UserPickerOption {
  id: string;
  label: string;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | null;
    return body?.error ?? err.statusText ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

@Component({
  selector: 'app-send-notification-form',
  imports: [FormsModule],
  templateUrl: './send-notification-form.html',
  styleUrl: './send-notification-form.css',
})
export class SendNotificationForm {
  private readonly store = inject(AdminNotificationsStore);

  readonly users = input.required<UserPickerOption[]>();

  readonly selectedUserId = signal('');
  readonly title = signal('Demo notification');
  readonly body = signal('');
  readonly icon = signal('');
  readonly scheduling = signal(false);
  readonly sendAt = signal('');
  readonly submitting = signal(false);
  readonly status = signal<string | null>(null);

  readonly submitLabel = computed(() => (this.scheduling() ? 'Schedule Push' : 'Send Push'));

  submit(): void {
    const username = this.selectedUserId();
    if (!username || this.submitting()) return;

    if (this.scheduling()) {
      this.submitSchedule(username);
    } else {
      this.submitSend(username);
    }
  }

  private submitSend(username: string): void {
    const request: SendNotificationRequest = {
      username,
      title: this.title(),
      body: this.body() || undefined,
      icon: this.icon() || undefined,
    };

    this.status.set('Sending...');
    this.submitting.set(true);
    this.store.send(request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.status.set(`Push sent to ${username}.`);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.status.set(`Failed: ${extractErrorMessage(err)}`);
      },
    });
  }

  private submitSchedule(username: string): void {
    if (!this.sendAt()) return;

    const request: ScheduleNotificationRequest = {
      username,
      title: this.title(),
      body: this.body() || undefined,
      icon: this.icon() || undefined,
      sendAt: new Date(this.sendAt()).toISOString(),
    };

    this.status.set('Scheduling...');
    this.submitting.set(true);
    this.store.schedule(request).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.status.set(`Push scheduled for ${username} at ${new Date(created.sendAt).toLocaleString()}.`);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.status.set(`Failed: ${extractErrorMessage(err)}`);
      },
    });
  }
}
