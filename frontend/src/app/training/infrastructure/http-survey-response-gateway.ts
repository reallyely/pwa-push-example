import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { SurveyResponseGateway, type SurveyResponseView, type AnswerView } from '@app/training/application/ports';

@Injectable({ providedIn: 'root' })
export class HttpSurveyResponseGateway implements SurveyResponseGateway {
  private readonly basePath = '/api';

  constructor(private readonly http: HttpClient) {}

  open(surveyId: string): Observable<SurveyResponseView> {
    return this.http.post<SurveyResponseView>(`${this.basePath}/survey-responses`, { surveyId }, { withCredentials: true });
  }

  recordResourceAccess(surveyResponseId: string, resourceId: string): Observable<void> {
    return this.http.post<void>(
      `${this.basePath}/survey-responses/${surveyResponseId}/resource-access`,
      { resourceId },
      { withCredentials: true },
    );
  }

  submit(surveyResponseId: string, answers: AnswerView[]): Observable<SurveyResponseView> {
    return this.http.post<SurveyResponseView>(
      `${this.basePath}/survey-responses/${surveyResponseId}/submit`,
      { answers },
      { withCredentials: true },
    );
  }

  get(surveyResponseId: string): Observable<SurveyResponseView> {
    return this.http.get<SurveyResponseView>(`${this.basePath}/survey-responses/${surveyResponseId}`, { withCredentials: true });
  }

  listForSurvey(surveyId: string): Observable<SurveyResponseView[]> {
    return this.http.get<SurveyResponseView[]>(`${this.basePath}/surveys/${surveyId}/responses`, { withCredentials: true });
  }
}
