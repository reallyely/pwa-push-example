import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { NotificationView } from '../application/ports';

@Component({
  selector: 'app-notification-history-table',
  imports: [DatePipe],
  templateUrl: './notification-history-table.html',
  styleUrl: './notification-history-table.css',
})
export class NotificationHistoryTable {
  readonly notifications = input.required<NotificationView[]>();
}
