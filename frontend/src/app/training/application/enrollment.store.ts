import { signal, type Signal } from '@angular/core';
import { map, switchMap, tap, type Observable } from 'rxjs';
import { EnrollmentGateway, type EnrollmentView, type BlackoutWindowView } from './ports';

export class EnrollmentStore {
  private readonly _trainingIds = signal<string[]>([]);
  readonly trainingIds: Signal<string[]> = this._trainingIds.asReadonly();

  private readonly _blackoutWindows = signal<BlackoutWindowView[]>([]);
  readonly blackoutWindows: Signal<BlackoutWindowView[]> = this._blackoutWindows.asReadonly();

  constructor(private readonly gateway: EnrollmentGateway) {}

  load(): Observable<EnrollmentView> {
    return this.gateway.me().pipe(
      tap((view) => {
        this._trainingIds.set(view.trainingIds);
        this._blackoutWindows.set(view.blackoutWindows);
      }),
    );
  }

  enroll(trainingId: string): Observable<void> {
    return this.gateway.enroll(trainingId).pipe(
      switchMap(() => this.load()),
      map(() => undefined),
    );
  }
}
