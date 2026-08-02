import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Table } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import type { NotificationView } from '@app/notification-delivery/application/ports';

@Component({
  selector: 'app-scheduled-table',
  imports: [DatePipe, Table, Tag, Button],
  templateUrl: './scheduled-table.html',
  styleUrl: './scheduled-table.css',
})
export class ScheduledTable {
  readonly notifications = input.required<NotificationView[]>();
  readonly cancel = output<string>();

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
