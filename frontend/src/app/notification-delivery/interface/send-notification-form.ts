import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { AdminNotificationsStore } from '@app/notification-delivery/application/admin-notifications.store';
import type { ScheduleNotificationRequest, SendNotificationRequest } from '@app/notification-delivery/application/ports';

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
  imports: [FormsModule, InputText, Select, Checkbox, DatePicker, Button, Message],
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
  readonly sendAt = signal<Date | null>(null);
  readonly submitting = signal(false);
  readonly status = signal<string | null>(null);

  readonly submitLabel = computed(() => (this.scheduling() ? 'Schedule Push' : 'Send Push'));
  readonly statusSeverity = computed(() => (this.status()?.startsWith('Failed') ? 'error' : 'success'));
  readonly userOptions = computed(() => this.users().map((u) => ({ label: u.label, value: u.id })));

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
    const sendAt = this.sendAt();
    if (!sendAt) return;

    const request: ScheduleNotificationRequest = {
      username,
      title: this.title(),
      body: this.body() || undefined,
      icon: this.icon() || undefined,
      sendAt: sendAt.toISOString(),
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
