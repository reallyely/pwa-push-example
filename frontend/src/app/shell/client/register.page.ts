import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Table } from 'primeng/table';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { TrainingsStore } from '@app/training/application/trainings.store';
import { EnrollmentStore } from '@app/training/application/enrollment.store';

@Component({
  selector: 'app-register-page',
  imports: [RouterLink, DatePipe, Table, Button, Tag],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css',
})
export class RegisterPage implements OnInit {
  protected readonly trainingsStore = inject(TrainingsStore);
  protected readonly enrollmentStore = inject(EnrollmentStore);

  ngOnInit(): void {
    this.trainingsStore.load().subscribe();
    this.enrollmentStore.load().subscribe();
  }

  protected isEnrolled(trainingId: string): boolean {
    return this.enrollmentStore.trainingIds().includes(trainingId);
  }

  protected enroll(trainingId: string): void {
    this.enrollmentStore.enroll(trainingId).subscribe();
  }
}
