import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { AuthStore } from '@app/identity/application/auth.store';
import { EnableNotificationsCard } from '@app/notification-delivery/interface/enable-notifications-card';

@Component({
  selector: 'app-client-home-page',
  imports: [Button, EnableNotificationsCard],
  templateUrl: './client-home.page.html',
  styleUrl: './client-home.page.css',
})
export class ClientHomePage {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  logout(): void {
    this.authStore.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
