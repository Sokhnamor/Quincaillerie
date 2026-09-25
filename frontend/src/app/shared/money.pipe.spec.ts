import { MoneyPipe, formatMoney } from './money.pipe';

/** fr-FR uses a narrow no-break space as thousands separator */
const normalize = (s: string) => s.replace(/[  ]/g, ' ');

describe('formatMoney', () => {
  it('formats amounts in FCFA without decimals', () => {
    expect(normalize(formatMoney(12500))).toBe('12 500 FCFA');
    expect(normalize(formatMoney('73780.00'))).toBe('73 780 FCFA');
  });

  it('rounds and treats empty values as zero', () => {
    expect(normalize(formatMoney(1999.6))).toBe('2 000 FCFA');
    expect(formatMoney(null)).toBe('0 FCFA');
    expect(formatMoney(undefined)).toBe('0 FCFA');
    expect(formatMoney('abc')).toBe('0 FCFA');
  });

  it('accepts another currency or none', () => {
    expect(normalize(formatMoney(1500, ''))).toBe('1 500');
    expect(normalize(formatMoney(10, '€'))).toBe('10 €');
  });

  it('is exposed as the "money" pipe', () => {
    expect(normalize(new MoneyPipe().transform(3540))).toBe('3 540 FCFA');
  });
});
