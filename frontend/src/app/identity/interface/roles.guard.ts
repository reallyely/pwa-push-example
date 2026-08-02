import { inject } from '@angular/core';
import { Router, type CanActivateFn, type UrlTree } from '@angular/router';
import type { Role } from 'domain/identity';
import { AuthStore } from '../application/auth.store';

export function rolesGuard(allowed: Role[], redirectTo: string): CanActivateFn {
  return (): boolean | UrlTree => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    const user = authStore.currentUser();
    if (user !== null && allowed.includes(user.role)) {
      return true;
    }
    return router.parseUrl(redirectTo);
  };
}
