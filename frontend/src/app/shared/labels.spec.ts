import { initials, todayIso, whatsappUrl } from './labels';

describe('whatsappUrl', () => {
  it('adds the Senegal country code to 9-digit local numbers', () => {
    expect(whatsappUrl('77 123 45 67', 'Bonjour')).toBe('https://wa.me/221771234567?text=Bonjour');
  });

  it('keeps international numbers', () => {
    expect(whatsappUrl('+221 78 000 00 00', 'x')).toBe('https://wa.me/221780000000?text=x');
    expect(whatsappUrl('0033612345678', 'x')).toBe('https://wa.me/33612345678?text=x');
  });

  it('encodes the message', () => {
    expect(whatsappUrl('771234567', 'Total : 1 500 FCFA\nMerci !')).toBe(
      'https://wa.me/221771234567?text=Total%20%3A%201%20500%20FCFA%0AMerci%20!'
    );
  });

  it('returns null without a phone number', () => {
    expect(whatsappUrl(null, 'x')).toBeNull();
    expect(whatsappUrl('', 'x')).toBeNull();
    expect(whatsappUrl('pas de numéro', 'x')).toBeNull();
  });
});

describe('initials', () => {
  it('takes the first letters of the first two words', () => {
    expect(initials('Mor Sokhna Toure')).toBe('MS');
    expect(initials('admin')).toBe('A');
    expect(initials(null)).toBe('?');
  });
});

describe('todayIso', () => {
  it('returns the local date as YYYY-MM-DD', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(todayIso()).toBe(expected);
  });
});
