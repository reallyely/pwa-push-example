import type { Routes } from '@angular/router';
import { sessionGuard } from '../../identity/interface/session.guard';
import { ClientLoginPage } from './client-login.page';
import { ClientHomePage } from './client-home.page';
import { NotificationDetailPage } from '../../notification-delivery/interface/notification-detail-page';

export const CLIENT_ROUTES: Routes = [
  { path: 'login', component: ClientLoginPage },
  { path: '', component: ClientHomePage, canActivate: [sessionGuard('/login')] },
  { path: 'notification/:id', component: NotificationDetailPage, canActivate: [sessionGuard('/login')] },
];
