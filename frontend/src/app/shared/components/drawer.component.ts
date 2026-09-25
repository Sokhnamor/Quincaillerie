import { Component, HostListener, input, output } from '@angular/core';

/** Side panel used for detail views */
@Component({
  selector: 'app-drawer',
  standalone: true,
  template: `
    @if (open()) {
      <div class="drawer-backdrop" (click)="closed.emit()"></div>
      <aside class="drawer" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <header class="drawer-header">
          <div>
            <h2 class="modal-title">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="modal-subtitle">{{ subtitle() }}</p>
            }
          </div>
          <button type="button" class="icon-btn" (click)="closed.emit()" aria-label="Fermer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="drawer-body">
          <ng-content></ng-content>
        </div>
        <footer class="drawer-footer">
          <ng-content select="[footer]"></ng-content>
        </footer>
      </aside>
    }
  `,
})
export class DrawerComponent {
  open = input(false);
  title = input('');
  subtitle = input('');
  closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }
}
