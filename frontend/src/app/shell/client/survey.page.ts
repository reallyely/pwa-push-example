import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyFill } from '@app/training/interface/survey-fill';

@Component({
  selector: 'app-survey-page',
  imports: [RouterLink, SurveyFill],
  templateUrl: './survey.page.html',
  styleUrl: './survey.page.css',
})
export class SurveyPage {
  readonly surveyId = input.required<string>();
}
