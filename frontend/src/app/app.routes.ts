import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadChildren: () => import('./shell/client/client.routes').then((m) => m.CLIENT_ROUTES) },
  { path: 'admin', loadChildren: () => import('./shell/admin/admin.routes').then((m) => m.ADMIN_ROUTES) },
];
