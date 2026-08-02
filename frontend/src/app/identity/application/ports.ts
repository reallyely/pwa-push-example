import type { Observable } from 'rxjs';
import type { Role } from 'domain/identity';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export abstract class AuthGateway {
  abstract register(email: string, password: string, role: Role): Observable<AuthenticatedUser>;
  abstract login(email: string, password: string): Observable<AuthenticatedUser>;
  abstract logout(): Observable<void>;
  abstract me(): Observable<AuthenticatedUser>;
  abstract listUsers(): Observable<AuthenticatedUser[]>;
}
