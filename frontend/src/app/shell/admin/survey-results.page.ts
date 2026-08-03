import { Component, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SurveysStore } from '@app/training/application/surveys.store';
import { SurveyResponseStore } from '@app/training/application/survey-response.store';
import { SurveyResults } from '@app/training/interface/survey-results';

@Component({
  selector: 'app-survey-results-page',
  imports: [RouterLink, DatePipe, SurveyResults],
  templateUrl: './survey-results.page.html',
  styleUrl: './survey-results.page.css',
})
export class SurveyResultsPage implements OnInit {
  private readonly surveysStore = inject(SurveysStore);
  protected readonly store = inject(SurveyResponseStore);

  readonly id = input.required<string>();

  protected readonly survey = computed(() => this.surveysStore.surveys().find((survey) => survey.id === this.id()) ?? null);

  ngOnInit(): void {
    this.surveysStore.load().subscribe();
    this.store.loadForSurvey(this.id()).subscribe();
  }
}
