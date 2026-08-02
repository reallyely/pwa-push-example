import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, type Observable } from 'rxjs';
import {
  NotificationGateway,
  type NotificationView,
  type ScheduleNotificationRequest,
  type SendNotificationRequest,
} from '../application/ports';

@Injectable({ providedIn: 'root' })
export class HttpNotificationGateway implements NotificationGateway {
  private readonly basePath = '/api';

  constructor(private readonly http: HttpClient) {}

  get(id: string): Observable<NotificationView> {
    return this.http.get<NotificationView>(`${this.basePath}/notifications/${id}`, { withCredentials: true });
  }

  send(request: SendNotificationRequest): Observable<void> {
    return this.http
      .post<{ ok: true }>(`${this.basePath}/send`, request, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  schedule(request: ScheduleNotificationRequest): Observable<NotificationView> {
    return this.http.post<NotificationView>(`${this.basePath}/schedule`, request, { withCredentials: true });
  }

  cancel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/scheduled/${id}`, { withCredentials: true });
  }

  list(): Observable<NotificationView[]> {
    return this.http.get<NotificationView[]>(`${this.basePath}/notifications`, { withCredentials: true });
  }

  listScheduled(): Observable<NotificationView[]> {
    return this.http.get<NotificationView[]>(`${this.basePath}/scheduled`, { withCredentials: true });
  }
}
