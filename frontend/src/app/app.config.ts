import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { AuthGateway } from './identity/application/ports';
import { AuthStore } from './identity/application/auth.store';
import { HttpAuthGateway } from './identity/infrastructure/http-auth-gateway';
import { RecipientGateway, NotificationGateway, PushSubscriptionPort } from './notification-delivery/application/ports';
import { EnablePushNotifications } from './notification-delivery/application/enable-push-notifications';
import { HttpRecipientGateway } from './notification-delivery/infrastructure/http-recipient-gateway';
import { HttpNotificationGateway } from './notification-delivery/infrastructure/http-notification-gateway';
import { BrowserPushGateway } from './notification-delivery/infrastructure/browser-push-gateway';
import { QuestionGateway, TrainerGateway, TrainingGateway, EnrollmentGateway, SurveyGateway, SurveyResponseGateway } from './training/application/ports';
import { QuestionsStore } from './training/application/questions.store';
import { TrainersStore } from './training/application/trainers.store';
import { TrainingsStore } from './training/application/trainings.store';
import { EnrollmentStore } from './training/application/enrollment.store';
import { SurveysStore } from './training/application/surveys.store';
import { SurveyResponseStore } from './training/application/survey-response.store';
import { HttpQuestionGateway } from './training/infrastructure/http-question-gateway';
import { HttpTrainerGateway } from './training/infrastructure/http-trainer-gateway';
import { HttpTrainingGateway } from './training/infrastructure/http-training-gateway';
import { HttpEnrollmentGateway } from './training/infrastructure/http-enrollment-gateway';
import { HttpSurveyGateway } from './training/infrastructure/http-survey-gateway';
import { HttpSurveyResponseGateway } from './training/infrastructure/http-survey-response-gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    providePrimeNG({
      theme: { preset: Aura },
      license:
        'eyJpZCI6IjA1YjUyNjNmLTUxOTQtNGQ3Ny1iZjIyLTNjMGY4NTk2ODIxNCIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODU2ODI1MjQsImV4cCI6MTgxNzIxODUyNH0.4q0mTaHvFCj_7QHCpSQ1w0a4gTuf8GX49MD2kmAuits4UHfcDQ17af1Gz6lJ0318piCFacY1yfVBCjG-oo1JBQ',
    }),

    { provide: AuthGateway, useClass: HttpAuthGateway },
    { provide: AuthStore, useFactory: () => new AuthStore(inject(AuthGateway)) },

    { provide: RecipientGateway, useClass: HttpRecipientGateway },
    { provide: NotificationGateway, useClass: HttpNotificationGateway },
    { provide: PushSubscriptionPort, useClass: BrowserPushGateway },
    {
      provide: EnablePushNotifications,
      useFactory: () => new EnablePushNotifications(inject(PushSubscriptionPort), inject(RecipientGateway)),
    },

    { provide: QuestionGateway, useClass: HttpQuestionGateway },
    {
      provide: QuestionsStore,
      useFactory: () => new QuestionsStore(inject(QuestionGateway)),
    },

    { provide: TrainerGateway, useClass: HttpTrainerGateway },
    {
      provide: TrainersStore,
      useFactory: () => new TrainersStore(inject(TrainerGateway)),
    },

    { provide: TrainingGateway, useClass: HttpTrainingGateway },
    {
      provide: TrainingsStore,
      useFactory: () => new TrainingsStore(inject(TrainingGateway)),
    },

    { provide: EnrollmentGateway, useClass: HttpEnrollmentGateway },
    {
      provide: EnrollmentStore,
      useFactory: () => new EnrollmentStore(inject(EnrollmentGateway)),
    },

    { provide: SurveyGateway, useClass: HttpSurveyGateway },
    {
      provide: SurveysStore,
      useFactory: () => new SurveysStore(inject(SurveyGateway)),
    },

    { provide: SurveyResponseGateway, useClass: HttpSurveyResponseGateway },
    {
      provide: SurveyResponseStore,
      useFactory: () => new SurveyResponseStore(inject(SurveyResponseGateway)),
    },
  ],
};
