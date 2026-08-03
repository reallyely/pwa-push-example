import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { SurveyGateway, type SurveyView, type CreateSurveyRequest } from '@app/training/application/ports';

@Injectable({ providedIn: 'root' })
export class HttpSurveyGateway implements SurveyGateway {
  private readonly basePath = '/api';

  constructor(private readonly http: HttpClient) {}

  create(request: CreateSurveyRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.basePath}/surveys`, request, { withCredentials: true });
  }

  list(): Observable<SurveyView[]> {
    return this.http.get<SurveyView[]>(`${this.basePath}/surveys`, { withCredentials: true });
  }
}
