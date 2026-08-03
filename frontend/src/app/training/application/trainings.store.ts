import { signal, type Signal } from '@angular/core';
import { map, switchMap, tap, type Observable } from 'rxjs';
import { TrainingGateway, type TrainingView, type CreateTrainingRequest } from './ports';

export class TrainingsStore {
  private readonly _trainings = signal<TrainingView[]>([]);
  readonly trainings: Signal<TrainingView[]> = this._trainings.asReadonly();

  constructor(private readonly gateway: TrainingGateway) {}

  load(): Observable<TrainingView[]> {
    return this.gateway.list().pipe(tap((list) => this._trainings.set(list)));
  }

  create(request: CreateTrainingRequest): Observable<void> {
    return this.gateway.create(request).pipe(
      switchMap(() => this.load()),
      map(() => undefined),
    );
  }
}
