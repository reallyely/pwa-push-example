import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { TrainingGateway, type TrainingView, type CreateTrainingRequest } from '@app/training/application/ports';

@Injectable({ providedIn: 'root' })
export class HttpTrainingGateway implements TrainingGateway {
  private readonly basePath = '/api';

  constructor(private readonly http: HttpClient) {}

  create(request: CreateTrainingRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.basePath}/trainings`, request, { withCredentials: true });
  }

  list(): Observable<TrainingView[]> {
    return this.http.get<TrainingView[]>(`${this.basePath}/trainings`, { withCredentials: true });
  }
}
