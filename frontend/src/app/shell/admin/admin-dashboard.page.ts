import { Component, inject } from '@angular/core';
import { AuthStore } from '@app/identity/application/auth.store';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [],
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin-dashboard.page.css',
})
export class AdminDashboardPage {
  protected readonly authStore = inject(AuthStore);
}
