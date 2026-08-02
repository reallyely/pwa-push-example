import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, type Observable } from 'rxjs';
import type { Role } from 'domain/identity';
import { AuthGateway, type AuthenticatedUser } from '../application/ports';

interface AuthResponseDto {
  id: string;
  email: string;
  role: Role;
}

function toAuthenticatedUser(dto: AuthResponseDto): AuthenticatedUser {
  return { id: dto.id, email: dto.email, role: dto.role };
}

// withCredentials: true so the browser sends/receives the httpOnly session cookie.
@Injectable({ providedIn: 'root' })
export class HttpAuthGateway implements AuthGateway {
  private readonly basePath = '/api/auth';

  constructor(private readonly http: HttpClient) {}

  register(email: string, password: string, role: Role): Observable<AuthenticatedUser> {
    return this.http
      .post<AuthResponseDto>(
        `${this.basePath}/register`,
        { email, password, role },
        { withCredentials: true },
      )
      .pipe(map(toAuthenticatedUser));
  }

  login(email: string, password: string): Observable<AuthenticatedUser> {
    return this.http
      .post<AuthResponseDto>(`${this.basePath}/login`, { email, password }, { withCredentials: true })
      .pipe(map(toAuthenticatedUser));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.basePath}/logout`, null, { withCredentials: true });
  }

  me(): Observable<AuthenticatedUser> {
    return this.http
      .get<AuthResponseDto>(`${this.basePath}/me`, { withCredentials: true })
      .pipe(map(toAuthenticatedUser));
  }

  listUsers(): Observable<AuthenticatedUser[]> {
    return this.http
      .get<AuthResponseDto[]>(`${this.basePath}/users`, { withCredentials: true })
      .pipe(map((dtos) => dtos.map(toAuthenticatedUser)));
  }
}
