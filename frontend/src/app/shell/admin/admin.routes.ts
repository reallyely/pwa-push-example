import type { Routes } from '@angular/router';
import { ROLES } from 'domain/identity';
import { sessionGuard } from '@app/identity/interface/session.guard';
import { rolesGuard } from '@app/identity/interface/roles.guard';
import { AdminLoginPage } from './admin-login.page';
import { AdminDashboardPage } from './admin-dashboard.page';

export const ADMIN_ROUTES: Routes = [
  { path: 'login', component: AdminLoginPage },
  {
    path: '',
    component: AdminDashboardPage,
    canActivate: [sessionGuard('/admin/login'), rolesGuard([ROLES.RESEARCHER, ROLES.TRAINER], '/admin/login')],
  },
];
