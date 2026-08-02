import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuestionsStore } from '@app/training/application/questions.store';
import { QuestionForm } from '@app/training/interface/question-form';
import { QuestionList } from '@app/training/interface/question-list';

@Component({
  selector: 'app-questions-page',
  imports: [RouterLink, QuestionForm, QuestionList],
  templateUrl: './questions.page.html',
  styleUrl: './questions.page.css',
})
export class QuestionsPage implements OnInit {
  protected readonly store = inject(QuestionsStore);

  ngOnInit(): void {
    this.store.load().subscribe();
  }
}
