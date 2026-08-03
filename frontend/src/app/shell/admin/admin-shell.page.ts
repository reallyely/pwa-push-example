import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Menubar } from 'primeng/menubar';
import { Button } from 'primeng/button';
import type { MenuItem } from 'primeng/api';
import { ROLES } from 'domain/identity';
import { AuthStore } from '@app/identity/application/auth.store';

@Component({
  selector: 'app-admin-shell-page',
  imports: [RouterOutlet, Menubar, Button],
  templateUrl: './admin-shell.page.html',
  styleUrl: './admin-shell.page.css',
})
export class AdminShellPage {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly navItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [
      { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/admin', routerLinkActiveOptions: { exact: true } },
    ];

    if (this.authStore.currentUser()?.role === ROLES.RESEARCHER) {
      items.push(
        { label: 'Questions', icon: 'pi pi-question-circle', routerLink: '/admin/questions' },
        { label: 'Trainings', icon: 'pi pi-calendar', routerLink: '/admin/trainings' },
        { label: 'Surveys', icon: 'pi pi-list-check', routerLink: '/admin/surveys' },
      );
    }

    return items;
  });

  logout(): void {
    this.authStore.logout().subscribe(() => this.router.navigateByUrl('/admin/login'));
  }
}
