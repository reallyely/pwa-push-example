import { signal, type Signal } from '@angular/core';
import { firstValueFrom, of, type Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { Role } from 'domain/identity';
import { AuthGateway, type AuthenticatedUser } from './ports';

export class AuthStore {
  private readonly _currentUser = signal<AuthenticatedUser | null>(null);

  readonly currentUser: Signal<AuthenticatedUser | null> = this._currentUser.asReadonly();

  readonly ready: Promise<AuthenticatedUser | null>;

  constructor(private readonly gateway: AuthGateway) {
    this.ready = firstValueFrom(this.refresh());
  }

  login(email: string, password: string): Observable<AuthenticatedUser> {
    return this.gateway.login(email, password).pipe(tap((user) => this._currentUser.set(user)));
  }

  register(email: string, password: string, role: Role): Observable<AuthenticatedUser> {
    return this.gateway
      .register(email, password, role)
      .pipe(tap((user) => this._currentUser.set(user)));
  }

  logout(): Observable<void> {
    return this.gateway.logout().pipe(tap(() => this._currentUser.set(null)));
  }

  refresh(): Observable<AuthenticatedUser | null> {
    return this.gateway.me().pipe(
      tap((user) => this._currentUser.set(user)),
      catchError(() => {
        this._currentUser.set(null);
        return of(null);
      }),
    );
  }
}
