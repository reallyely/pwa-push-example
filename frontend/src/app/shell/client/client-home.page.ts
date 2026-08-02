import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../identity/application/auth.store';
import { EnableNotificationsCard } from '../../notification-delivery/interface/enable-notifications-card';

@Component({
  selector: 'app-client-home-page',
  imports: [EnableNotificationsCard],
  templateUrl: './client-home.page.html',
})
export class ClientHomePage {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  logout(): void {
    this.authStore.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
