import { Component, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Table } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import type { AnswerView, SurveyResponseView } from '@app/training/application/ports';

@Component({
  selector: 'app-survey-results',
  imports: [Table, Tag, Button, DatePipe],
  templateUrl: './survey-results.html',
  styleUrl: './survey-results.css',
})
export class SurveyResults {
  readonly responses = input.required<SurveyResponseView[]>();

  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected toggle(id: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds.set(next);
  }

  protected formatValue(value: AnswerView['value']): string {
    return Array.isArray(value) ? value.join(', ') : value;
  }
}
