import { Component, input } from '@angular/core';
import { Table } from 'primeng/table';
import { Tag } from 'primeng/tag';
import type { QuestionView } from '@app/training/application/ports';

@Component({
  selector: 'app-question-list',
  imports: [Table, Tag],
  templateUrl: './question-list.html',
  styleUrl: './question-list.css',
})
export class QuestionList {
  readonly questions = input.required<QuestionView[]>();

  protected answerFormatSummary(question: QuestionView): string {
    const format = question.answerFormat;
    switch (format.kind) {
      case 'FreeInput':
        return 'Free input';
      case 'Likert':
        return `Likert (${format.scale.length}-point)`;
      case 'Choice':
        return `Choice (${format.options.length} option${format.options.length === 1 ? '' : 's'}${format.allowMultiple ? ', multi-select' : ''})`;
    }
  }
}
