import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ROLES } from 'domain/identity';
import { LoginForm } from '../../identity/interface/login-form';
import type { AuthenticatedUser } from '../../identity/application/ports';

@Component({
  selector: 'app-admin-login-page',
  imports: [LoginForm],
  template: `<app-login-form [allowedRegisterRoles]="allowedRegisterRoles" (success)="onSuccess($event)" />`,
})
export class AdminLoginPage {
  protected readonly allowedRegisterRoles = [ROLES.RESEARCHER, ROLES.TRAINER];

  constructor(private readonly router: Router) {}

  onSuccess(_user: AuthenticatedUser): void {
    this.router.navigateByUrl('/admin');
  }
}
