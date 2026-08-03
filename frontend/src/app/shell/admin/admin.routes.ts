import type { Routes } from '@angular/router';
import { ROLES } from 'domain/identity';
import { sessionGuard } from '@app/identity/interface/session.guard';
import { rolesGuard } from '@app/identity/interface/roles.guard';
import { AdminLoginPage } from './admin-login.page';
import { AdminShellPage } from './admin-shell.page';
import { AdminDashboardPage } from './admin-dashboard.page';
import { QuestionsPage } from './questions.page';
import { TrainingsPage } from './trainings.page';
import { SurveysPage } from './surveys.page';
import { SurveyResultsPage } from './survey-results.page';

export const ADMIN_ROUTES: Routes = [
  { path: 'login', component: AdminLoginPage },
  {
    path: '',
    component: AdminShellPage,
    canActivate: [sessionGuard('/admin/login'), rolesGuard([ROLES.RESEARCHER, ROLES.TRAINER], '/admin/login')],
    children: [
      { path: '', component: AdminDashboardPage },
      { path: 'questions', component: QuestionsPage, canActivate: [rolesGuard([ROLES.RESEARCHER], '/admin/login')] },
      { path: 'trainings', component: TrainingsPage, canActivate: [rolesGuard([ROLES.RESEARCHER], '/admin/login')] },
      { path: 'surveys', component: SurveysPage, canActivate: [rolesGuard([ROLES.RESEARCHER], '/admin/login')] },
      {
        path: 'surveys/:id/results',
        component: SurveyResultsPage,
        canActivate: [rolesGuard([ROLES.RESEARCHER], '/admin/login')],
      },
    ],
  },
];
