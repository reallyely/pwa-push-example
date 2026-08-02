import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Table } from 'primeng/table';
import { Tag } from 'primeng/tag';
import type { NotificationView } from '@app/notification-delivery/application/ports';

@Component({
  selector: 'app-notification-history-table',
  imports: [DatePipe, Table, Tag],
  templateUrl: './notification-history-table.html',
  styleUrl: './notification-history-table.css',
})
export class NotificationHistoryTable {
  readonly notifications = input.required<NotificationView[]>();

  protected statusSeverity(status: NotificationView['status']): 'info' | 'success' | 'secondary' | 'danger' {
    switch (status) {
      case 'sent':
        return 'success';
      case 'pending':
        return 'info';
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
