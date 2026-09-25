import { MovementType, PaymentMethod, QuoteStatus, SaleStatus, StockStatus } from '../core/models';

export const SALE_STATUS: Record<SaleStatus, { label: string; badge: string }> = {
  paid: { label: 'Payée', badge: 'badge-success' },
  partial: { label: 'Partielle', badge: 'badge-warning' },
  unpaid: { label: 'Impayée', badge: 'badge-danger' },
};

export const STOCK_STATUS: Record<StockStatus, { label: string; badge: string }> = {
  in_stock: { label: 'En stock', badge: 'badge-success' },
  low_stock: { label: 'Stock faible', badge: 'badge-warning' },
  out_of_stock: { label: 'Rupture', badge: 'badge-danger' },
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Espèces', icon: 'fa-money-bill-wave' },
  { value: 'wave', label: 'Wave', icon: 'fa-water' },
  { value: 'orange_money', label: 'Orange Money', icon: 'fa-mobile-screen' },
  { value: 'card', label: 'Carte', icon: 'fa-credit-card' },
  { value: 'transfer', label: 'Virement', icon: 'fa-building-columns' },
  { value: 'cheque', label: 'Chèque', icon: 'fa-money-check' },
];

export const PAYMENT_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map(m => [m.value, m.label]));

export const MOVEMENT_TYPES: Record<MovementType, { label: string; icon: string; tone: string }> = {
  initial: { label: 'Stock initial', icon: 'fa-flag', tone: 'neutral' },
  sale: { label: 'Vente', icon: 'fa-cart-shopping', tone: 'out' },
  sale_cancel: { label: 'Annulation vente', icon: 'fa-rotate-left', tone: 'in' },
  return: { label: 'Retour client', icon: 'fa-arrow-rotate-left', tone: 'in' },
  purchase: { label: 'Approvisionnement', icon: 'fa-truck-ramp-box', tone: 'in' },
  purchase_cancel: { label: 'Annulation achat', icon: 'fa-rotate-left', tone: 'out' },
  adjustment: { label: 'Ajustement', icon: 'fa-sliders', tone: 'neutral' },
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; badge: string }> = {
  draft: { label: 'Brouillon', badge: '' },
  sent: { label: 'Envoyé', badge: 'badge-info' },
  accepted: { label: 'Accepté', badge: 'badge-success' },
  rejected: { label: 'Refusé', badge: 'badge-danger' },
  converted: { label: 'Converti en vente', badge: 'badge-brand' },
};

/**
 * WhatsApp link with a pre-filled message. Senegalese numbers without
 * country code get +221. Returns null when no usable number is given.
 */
export function whatsappUrl(phone: string | null | undefined, message: string): string | null {
  let digits = (phone ?? '').replace(/[^\d+]/g, '');
  if (!digits) {
    return null;
  }
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.length === 9) {
    digits = '221' + digits;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const UNITS = ['pièce', 'kg', 'm', 'm²', 'litre', 'sac', 'boîte', 'rouleau', 'paquet', 'lot'];

/** Triggers a browser download for a Blob */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the browser print dialog for a PDF Blob (receipt printer, A5, A4…) */
export function printBlob(blob: Blob): void {
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.src = url;
  frame.onload = () => {
    setTimeout(() => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.open(url, '_blank');
      }
    }, 300);
  };
  document.body.appendChild(frame);
  // Leave the frame alive long enough for the print dialog, then clean up
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 120_000);
}

export const INVOICE_FORMATS = [
  { value: 'ticket', label: 'Ticket 80 mm', icon: 'fa-receipt', hint: 'Imprimante thermique de caisse' },
  { value: 'a5', label: 'A5', icon: 'fa-file-lines', hint: 'Demi-page, carnet de factures' },
  { value: 'a4', label: 'A4', icon: 'fa-file', hint: 'Page entière, imprimante bureau' },
] as const;

export function initials(name: string | null | undefined): string {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
