import { signal, type Signal } from '@angular/core';
import { map, switchMap, tap, type Observable } from 'rxjs';
import { TrainerGateway, type TrainerView, type CreateTrainerRequest } from './ports';

export class TrainersStore {
  private readonly _trainers = signal<TrainerView[]>([]);
  readonly trainers: Signal<TrainerView[]> = this._trainers.asReadonly();

  constructor(private readonly gateway: TrainerGateway) {}

  load(): Observable<TrainerView[]> {
    return this.gateway.list().pipe(tap((list) => this._trainers.set(list)));
  }

  create(request: CreateTrainerRequest): Observable<void> {
    return this.gateway.create(request).pipe(
      switchMap(() => this.load()),
      map(() => undefined),
    );
  }
}
