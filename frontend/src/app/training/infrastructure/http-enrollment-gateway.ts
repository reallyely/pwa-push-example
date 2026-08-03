import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { EnrollmentGateway, type EnrollmentView } from '@app/training/application/ports';

@Injectable({ providedIn: 'root' })
export class HttpEnrollmentGateway implements EnrollmentGateway {
  private readonly basePath = '/api';

  constructor(private readonly http: HttpClient) {}

  enroll(trainingId: string): Observable<{ trainingId: string }> {
    return this.http.post<{ trainingId: string }>(
      `${this.basePath}/enrollments`,
      { trainingId },
      { withCredentials: true },
    );
  }

  me(): Observable<EnrollmentView> {
    return this.http.get<EnrollmentView>(`${this.basePath}/enrollments/me`, { withCredentials: true });
  }
}
