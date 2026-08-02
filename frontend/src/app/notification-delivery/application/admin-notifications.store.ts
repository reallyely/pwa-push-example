import { signal, type Signal } from '@angular/core';
import { map, switchMap, tap, type Observable } from 'rxjs';
import {
  NotificationGateway,
  type NotificationView,
  type ScheduleNotificationRequest,
  type SendNotificationRequest,
} from './ports';

export class AdminNotificationsStore {
  private readonly _scheduled = signal<NotificationView[]>([]);
  readonly scheduled: Signal<NotificationView[]> = this._scheduled.asReadonly();

  private readonly _history = signal<NotificationView[]>([]);
  readonly history: Signal<NotificationView[]> = this._history.asReadonly();

  constructor(private readonly gateway: NotificationGateway) {}

  loadScheduled(): Observable<NotificationView[]> {
    return this.gateway.listScheduled().pipe(tap((list) => this._scheduled.set(list)));
  }

  loadHistory(): Observable<NotificationView[]> {
    return this.gateway.list().pipe(tap((list) => this._history.set(list)));
  }

  send(request: SendNotificationRequest): Observable<void> {
    return this.gateway.send(request).pipe(
      switchMap(() => this.loadHistory()),
      map(() => undefined),
    );
  }

  schedule(request: ScheduleNotificationRequest): Observable<NotificationView> {
    return this.gateway
      .schedule(request)
      .pipe(switchMap((created) => this.loadScheduled().pipe(map(() => created))));
  }

  cancel(id: string): Observable<void> {
    return this.gateway.cancel(id).pipe(
      switchMap(() => this.loadScheduled()),
      map(() => undefined),
    );
  }
}
