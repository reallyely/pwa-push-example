import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Table } from 'primeng/table';
import type { SurveyView } from '@app/training/application/ports';

@Component({
  selector: 'app-survey-list',
  imports: [Table, DatePipe, RouterLink],
  templateUrl: './survey-list.html',
  styleUrl: './survey-list.css',
})
export class SurveyList {
  readonly surveys = input.required<SurveyView[]>();
  readonly trainingOptions = input.required<{ label: string; value: string }[]>();

  protected trainingLabel(survey: SurveyView): string {
    return this.trainingOptions().find((option) => option.value === survey.trainingId)?.label ?? survey.trainingId;
  }
}
