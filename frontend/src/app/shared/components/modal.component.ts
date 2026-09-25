import { Component, HostListener, input, output } from '@angular/core';

/**
 * Usage:
 * <app-modal [open]="show()" title="..." (closed)="show.set(false)">
 *   body...
 *   <ng-container footer>buttons</ng-container>
 * </app-modal>
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (open()) {
      <div class="modal-backdrop" (click)="close()"></div>
      <div class="modal-wrap" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <div class="modal" [class.modal-lg]="size() === 'lg'" [class.modal-xl]="size() === 'xl'" [class.modal-sm]="size() === 'sm'">
          <header class="modal-header">
            <div>
              <h2 class="modal-title">{{ title() }}</h2>
              @if (subtitle()) {
                <p class="modal-subtitle">{{ subtitle() }}</p>
              }
            </div>
            <button type="button" class="icon-btn" (click)="close()" aria-label="Fermer">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="modal-body">
            <ng-content></ng-content>
          </div>
          <footer class="modal-footer">
            <ng-content select="[footer]"></ng-content>
          </footer>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  open = input(false);
  title = input('');
  subtitle = input('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }
}
