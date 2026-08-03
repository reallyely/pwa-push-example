import { Component, OnInit, computed, inject } from '@angular/core';
import { TrainersStore } from '@app/training/application/trainers.store';
import { TrainingsStore } from '@app/training/application/trainings.store';
import { TrainerForm } from '@app/training/interface/trainer-form';
import { TrainerList } from '@app/training/interface/trainer-list';
import { TrainingForm } from '@app/training/interface/training-form';
import { TrainingList } from '@app/training/interface/training-list';

@Component({
  selector: 'app-trainings-page',
  imports: [TrainerForm, TrainerList, TrainingForm, TrainingList],
  templateUrl: './trainings.page.html',
  styleUrl: './trainings.page.css',
})
export class TrainingsPage implements OnInit {
  protected readonly store = inject(TrainingsStore);
  protected readonly trainersStore = inject(TrainersStore);

  protected readonly trainerOptions = computed(() =>
    this.trainersStore.trainers().map((t) => ({ label: t.name, value: t.id })),
  );

  ngOnInit(): void {
    this.store.load().subscribe();
    this.trainersStore.load().subscribe();
  }
}
