import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 12500 -> "12 500 FCFA" */
export function formatMoney(value: number | string | null | undefined, currency = 'FCFA'): string {
  const amount = Number(value ?? 0);
  return `${formatter.format(Number.isFinite(amount) ? amount : 0)} ${currency}`.trim();
}

@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, currency = 'FCFA'): string {
    return formatMoney(value, currency);
  }
}
