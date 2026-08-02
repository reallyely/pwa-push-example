import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import type { Role } from 'domain/identity';
import { AuthStore } from '@app/identity/application/auth.store';
import type { AuthenticatedUser } from '@app/identity/application/ports';

type Mode = 'login' | 'register';

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | null;
    return body?.error ?? err.statusText ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

@Component({
  selector: 'app-login-form',
  imports: [FormsModule, InputText, Password, Select, Button, Message],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css',
})
export class LoginForm {
  private readonly authStore = inject(AuthStore);

  readonly allowedRegisterRoles = input.required<Role[]>();
  readonly success = output<AuthenticatedUser>();

  readonly mode = signal<Mode>('login');
  readonly email = signal('');
  readonly password = signal('');
  readonly selectedRole = signal<Role | undefined>(undefined);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly showRolePicker = computed(() => this.allowedRegisterRoles().length > 1);
  readonly heading = computed(() => (this.mode() === 'login' ? 'Log In' : 'Create Account'));
  readonly roleOptions = computed(() => this.allowedRegisterRoles().map((role) => ({ label: role, value: role })));

  toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.error.set(null);
  }

  submit(): void {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) return;

    this.error.set(null);
    this.submitting.set(true);

    const request$ =
      this.mode() === 'login'
        ? this.authStore.login(email, password)
        : this.authStore.register(email, password, this.selectedRole() ?? this.allowedRegisterRoles()[0]);

    request$.subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.success.emit(user);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(extractErrorMessage(err));
      },
    });
  }
}
