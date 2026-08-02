import { inject } from '@angular/core';
import { Router, type CanActivateFn, type UrlTree } from '@angular/router';
import { AuthStore } from '../application/auth.store';

export function sessionGuard(loginPath: string): CanActivateFn {
  return async (): Promise<boolean | UrlTree> => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    await authStore.ready;

    if (authStore.currentUser() !== null) {
      return true;
    }
    return router.parseUrl(loginPath);
  };
}
