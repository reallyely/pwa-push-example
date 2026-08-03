import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { TrainerGateway, type TrainerView, type CreateTrainerRequest } from '@app/training/application/ports';

@Injectable({ providedIn: 'root' })
export class HttpTrainerGateway implements TrainerGateway {
  private readonly basePath = '/api';

  constructor(private readonly http: HttpClient) {}

  create(request: CreateTrainerRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.basePath}/trainers`, request, { withCredentials: true });
  }

  list(): Observable<TrainerView[]> {
    return this.http.get<TrainerView[]>(`${this.basePath}/trainers`, { withCredentials: true });
  }
}
