import { signal, type Signal } from '@angular/core';
import { tap, type Observable } from 'rxjs';
import { SurveyResponseGateway, type SurveyResponseView, type AnswerView } from './ports';

export class SurveyResponseStore {
  private readonly _current = signal<SurveyResponseView | null>(null);
  readonly current: Signal<SurveyResponseView | null> = this._current.asReadonly();

  private readonly _responses = signal<SurveyResponseView[]>([]);
  readonly responses: Signal<SurveyResponseView[]> = this._responses.asReadonly();

  constructor(private readonly gateway: SurveyResponseGateway) {}

  open(surveyId: string): Observable<SurveyResponseView> {
    return this.gateway.open(surveyId).pipe(tap((response) => this._current.set(response)));
  }

  recordResourceAccess(resourceId: string): Observable<void> {
    const current = this._current();
    if (!current) throw new Error('no open survey response to record a resource access against');
    return this.gateway.recordResourceAccess(current.id, resourceId);
  }

  submit(answers: AnswerView[]): Observable<SurveyResponseView> {
    const current = this._current();
    if (!current) throw new Error('no open survey response to submit');
    return this.gateway.submit(current.id, answers).pipe(tap((response) => this._current.set(response)));
  }

  loadForSurvey(surveyId: string): Observable<SurveyResponseView[]> {
    return this.gateway.listForSurvey(surveyId).pipe(tap((list) => this._responses.set(list)));
  }
}
