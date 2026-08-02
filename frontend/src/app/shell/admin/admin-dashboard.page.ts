import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Button } from 'primeng/button';
import { AuthStore } from '@app/identity/application/auth.store';
import { AuthGateway } from '@app/identity/application/ports';
import { RecipientGateway } from '@app/notification-delivery/application/ports';
import { AdminNotificationsStore } from '@app/notification-delivery/application/admin-notifications.store';
import { SendNotificationForm, type UserPickerOption } from '@app/notification-delivery/interface/send-notification-form';
import { ScheduledTable } from '@app/notification-delivery/interface/scheduled-table';
import { NotificationHistoryTable } from '@app/notification-delivery/interface/notification-history-table';
import { mergeUserPickerOptions } from './user-picker';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [Button, SendNotificationForm, ScheduledTable, NotificationHistoryTable],
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin-dashboard.page.css',
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
