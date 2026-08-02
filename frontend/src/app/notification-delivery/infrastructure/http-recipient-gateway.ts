import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, type Observable } from 'rxjs';
import type { PushSubscriptionJSON } from 'domain/notification-delivery';
import { RecipientGateway, type RecipientView } from '@app/notification-delivery/application/ports';

@Injectable({ providedIn: 'root' })
export class HttpRecipientGateway implements RecipientGateway {
  private readonly basePath = '/api';

  constructor(private readonly http: HttpClient) {}

  vapidPublicKey(): Observable<string> {
    return this.http
      .get<{ publicKey: string }>(`${this.basePath}/vapid-public-key`, { withCredentials: true })
      .pipe(map((res) => res.publicKey));
  }

  subscribe(subscription: PushSubscriptionJSON): Observable<void> {
    return this.http.post<void>(`${this.basePath}/subscribe`, { subscription }, { withCredentials: true });
  }

  resubscribe(oldEndpoint: string, subscription: PushSubscriptionJSON): Observable<void> {
    return this.http.post<void>(
      `${this.basePath}/resubscribe`,
      { oldEndpoint, subscription },
      { withCredentials: true },
    );
  }

  listUsers(): Observable<RecipientView[]> {
    return this.http.get<RecipientView[]>(`${this.basePath}/users`, { withCredentials: true });
  }
}
