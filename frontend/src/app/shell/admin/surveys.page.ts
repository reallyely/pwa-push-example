import { Component, OnInit, computed, inject } from '@angular/core';
import { TrainingsStore } from '@app/training/application/trainings.store';
import { QuestionsStore } from '@app/training/application/questions.store';
import { SurveysStore } from '@app/training/application/surveys.store';
import { SurveyForm } from '@app/training/interface/survey-form';
import { SurveyList } from '@app/training/interface/survey-list';

@Component({
  selector: 'app-surveys-page',
  imports: [SurveyForm, SurveyList],
  templateUrl: './surveys.page.html',
  styleUrl: './surveys.page.css',
})
export class SurveysPage implements OnInit {
  protected readonly store = inject(SurveysStore);
  private readonly trainingsStore = inject(TrainingsStore);
  protected readonly questionsStore = inject(QuestionsStore);

  protected readonly trainingOptions = computed(() =>
    this.trainingsStore.trainings().map((training) => ({
      label: new Date(training.dateTime).toLocaleString(),
      value: training.id,
    })),
  );

  ngOnInit(): void {
    this.store.load().subscribe();
    this.trainingsStore.load().subscribe();
    this.questionsStore.load().subscribe();
  }
}
