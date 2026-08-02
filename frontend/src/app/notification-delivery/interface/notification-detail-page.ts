import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Message } from 'primeng/message';
import { NotificationGateway, type NotificationView } from '@app/notification-delivery/application/ports';

type LoadState = 'loading' | 'loaded' | 'unauthorized' | 'forbidden' | 'error';

@Component({
  selector: 'app-notification-detail-page',
  imports: [Card, Tag, Message],
  templateUrl: './notification-detail-page.html',
  styleUrl: './notification-detail-page.css',
})
export class NotificationDetailPage implements OnInit {
  private readonly gateway = inject(NotificationGateway);

  readonly id = input.required<string>();

  protected readonly state = signal<LoadState>('loading');
  protected readonly notification = signal<NotificationView | null>(null);

  protected readonly errorMessage = computed(() => {
    switch (this.state()) {
      case 'unauthorized':
        return 'Please log in to view this notification.';
      case 'forbidden':
        // Phrased as "not found" rather than confirming the id belongs to someone else.
        return 'Notification not found.';
      case 'error':
        return 'Failed to load notification.';
      default:
        return null;
    }
  });

  ngOnInit(): void {
    this.state.set('loading');
    this.gateway.get(this.id()).subscribe({
      next: (notification) => {
        this.notification.set(notification);
        this.state.set('loaded');
      },
      error: (err: unknown) => {
        const status = err instanceof HttpErrorResponse ? err.status : null;
        if (status === 401) {
          this.state.set('unauthorized');
        } else if (status === 403 || status === 404) {
          this.state.set('forbidden');
        } else {
          this.state.set('error');
        }
      },
    });
  }
}
