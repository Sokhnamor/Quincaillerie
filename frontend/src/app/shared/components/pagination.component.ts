import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (total() > 0) {
      <div class="pagination">
        <span class="pagination-info">
          {{ from() }}–{{ to() }} sur <strong>{{ total() }}</strong>
        </span>
        @if (lastPage() > 1) {
          <div class="pagination-pages">
            <button type="button" class="page-btn" [disabled]="page() <= 1" (click)="go(page() - 1)" aria-label="Page précédente">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            @for (p of pages(); track $index) {
              @if (p === 0) {
                <span class="page-gap">…</span>
              } @else {
                <button type="button" class="page-btn" [class.active]="p === page()" (click)="go(p)">{{ p }}</button>
              }
            }
            <button type="button" class="page-btn" [disabled]="page() >= lastPage()" (click)="go(page() + 1)" aria-label="Page suivante">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class PaginationComponent {
  page = input(1);
  lastPage = input(1);
  total = input(0);
  from = input<number | null>(0);
  to = input<number | null>(0);
  pageChange = output<number>();

  /** Page numbers with 0 as an ellipsis marker */
  pages = computed(() => {
    const last = this.lastPage();
    const current = this.page();
    const set = new Set([1, last, current - 1, current, current + 1].filter(p => p >= 1 && p <= last));
    const sorted = [...set].sort((a, b) => a - b);
    const result: number[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) {
        result.push(0);
      }
      result.push(p);
    });
    return result;
  });

  go(p: number): void {
    if (p >= 1 && p <= this.lastPage() && p !== this.page()) {
      this.pageChange.emit(p);
    }
  }
}
