import { Component, input } from '@angular/core';
import { Table } from 'primeng/table';
import type { TrainerView } from '@app/training/application/ports';

@Component({
  selector: 'app-trainer-list',
  imports: [Table],
  templateUrl: './trainer-list.html',
  styleUrl: './trainer-list.css',
})
export class TrainerList {
  readonly trainers = input.required<TrainerView[]>();
}
