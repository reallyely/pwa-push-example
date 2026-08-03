import { signal, type Signal } from '@angular/core';
import { map, switchMap, tap, type Observable } from 'rxjs';
import { SurveyGateway, type SurveyView, type CreateSurveyRequest } from './ports';

export class SurveysStore {
  private readonly _surveys = signal<SurveyView[]>([]);
  readonly surveys: Signal<SurveyView[]> = this._surveys.asReadonly();

  constructor(private readonly gateway: SurveyGateway) {}

  load(): Observable<SurveyView[]> {
    return this.gateway.list().pipe(tap((list) => this._surveys.set(list)));
  }

  create(request: CreateSurveyRequest): Observable<void> {
    return this.gateway.create(request).pipe(
      switchMap(() => this.load()),
      map(() => undefined),
    );
  }
}
