import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ROLES } from 'domain/identity';
import { LoginForm } from '@app/identity/interface/login-form';
import type { AuthenticatedUser } from '@app/identity/application/ports';

@Component({
  selector: 'app-client-login-page',
  imports: [LoginForm],
  template: `<app-login-form [allowedRegisterRoles]="allowedRegisterRoles" (success)="onSuccess($event)" />`,
})
export class ClientLoginPage {
  protected readonly allowedRegisterRoles = [ROLES.PARTICIPANT];

  constructor(private readonly router: Router) {}

  onSuccess(_user: AuthenticatedUser): void {
    this.router.navigateByUrl('/');
  }
}
