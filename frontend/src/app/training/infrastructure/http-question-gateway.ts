import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { QuestionGateway, type QuestionView, type CreateQuestionRequest } from '@app/training/application/ports';

@Injectable({ providedIn: 'root' })
export class HttpQuestionGateway implements QuestionGateway {
  private readonly basePath = '/api';

  constructor(private readonly http: HttpClient) {}

  create(request: CreateQuestionRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.basePath}/questions`, request, { withCredentials: true });
  }

  list(): Observable<QuestionView[]> {
    return this.http.get<QuestionView[]>(`${this.basePath}/questions`, { withCredentials: true });
  }
}
