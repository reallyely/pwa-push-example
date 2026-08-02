import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { NotificationView } from '../application/ports';

@Component({
  selector: 'app-scheduled-table',
  imports: [DatePipe],
  templateUrl: './scheduled-table.html',
  styleUrl: './scheduled-table.css',
})
export class ScheduledTable {
  readonly notifications = input.required<NotificationView[]>();
  readonly cancel = output<string>();
}
