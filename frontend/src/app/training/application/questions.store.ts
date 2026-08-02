import { signal, type Signal } from '@angular/core';
import { map, switchMap, tap, type Observable } from 'rxjs';
import { QuestionGateway, type QuestionView, type CreateQuestionRequest } from './ports';

export class QuestionsStore {
  private readonly _questions = signal<QuestionView[]>([]);
  readonly questions: Signal<QuestionView[]> = this._questions.asReadonly();

  constructor(private readonly gateway: QuestionGateway) {}

  load(): Observable<QuestionView[]> {
    return this.gateway.list().pipe(tap((list) => this._questions.set(list)));
  }

  create(request: CreateQuestionRequest): Observable<void> {
    return this.gateway.create(request).pipe(
      switchMap(() => this.load()),
      map(() => undefined),
    );
  }
}
