import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Table } from 'primeng/table';
import type { TrainingView } from '@app/training/application/ports';

@Component({
  selector: 'app-training-list',
  imports: [Table, DatePipe],
  templateUrl: './training-list.html',
  styleUrl: './training-list.css',
})
export class TrainingList {
  readonly trainings = input.required<TrainingView[]>();
  readonly trainerOptions = input.required<{ label: string; value: string }[]>();

  protected trainerLabel(training: TrainingView): string {
    return this.trainerOptions().find((option) => option.value === training.trainerId)?.label ?? training.trainerId;
  }
}
