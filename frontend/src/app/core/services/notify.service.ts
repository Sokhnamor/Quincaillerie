import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

/**
 * Toasts and confirmation dialogs (SweetAlert2), styled by the global theme
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
    customClass: { popup: 'qp-toast' },
  });

  success(message: string): void {
    this.toast.fire({ icon: 'success', title: message });
  }

  info(message: string): void {
    this.toast.fire({ icon: 'info', title: message });
  }

  error(errorOrMessage: unknown, fallback = 'Une erreur est survenue'): void {
    this.toast.fire({ icon: 'error', title: NotifyService.message(errorOrMessage, fallback), timer: 5000 });
  }

  async confirm(options: { title: string; text?: string; confirmText?: string; danger?: boolean }): Promise<boolean> {
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.danger ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: options.confirmText ?? 'Confirmer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      focusCancel: !!options.danger,
      buttonsStyling: false,
      customClass: {
        popup: 'qp-dialog',
        confirmButton: options.danger ? 'btn btn-danger' : 'btn btn-primary',
        cancelButton: 'btn btn-secondary',
        actions: 'qp-dialog-actions',
      },
    });
    return result.isConfirmed;
  }

  /** Extracts the most useful message from a Laravel error response */
  static message(error: unknown, fallback = 'Une erreur est survenue'): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Serveur injoignable. Vérifiez que l\'API est démarrée.';
      }
      const body = error.error;
      if (body?.errors) {
        const first = Object.values(body.errors as Record<string, string[]>)[0];
        if (first?.length) {
          return first[0];
        }
      }
      if (body?.message) {
        return body.message;
      }
    }
    return fallback;
  }
}
