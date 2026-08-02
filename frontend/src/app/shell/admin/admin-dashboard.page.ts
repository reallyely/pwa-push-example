import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthStore } from '../../identity/application/auth.store';
import { AuthGateway } from '../../identity/application/ports';
import { RecipientGateway } from '../../notification-delivery/application/ports';
import { AdminNotificationsStore } from '../../notification-delivery/application/admin-notifications.store';
import { SendNotificationForm, type UserPickerOption } from '../../notification-delivery/interface/send-notification-form';
import { ScheduledTable } from '../../notification-delivery/interface/scheduled-table';
import { NotificationHistoryTable } from '../../notification-delivery/interface/notification-history-table';
import { mergeUserPickerOptions } from './user-picker';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [SendNotificationForm, ScheduledTable, NotificationHistoryTable],
  templateUrl: './admin-dashboard.page.html',
})
export class AdminDashboardPage implements OnInit {
  protected readonly authStore = inject(AuthStore);
  private readonly authGateway = inject(AuthGateway);
  private readonly recipientGateway = inject(RecipientGateway);
  protected readonly notificationsStore = inject(AdminNotificationsStore);
  private readonly router = inject(Router);

  protected readonly users = signal<UserPickerOption[]>([]);

  ngOnInit(): void {
    forkJoin([this.authGateway.listUsers(), this.recipientGateway.listUsers()]).subscribe(
      ([users, recipients]) => this.users.set(mergeUserPickerOptions(users, recipients)),
    );
    this.notificationsStore.loadScheduled().subscribe();
    this.notificationsStore.loadHistory().subscribe();
  }

  onCancel(id: string): void {
    this.notificationsStore.cancel(id).subscribe();
  }

  logout(): void {
    this.authStore.logout().subscribe(() => this.router.navigateByUrl('/admin/login'));
  }
}
