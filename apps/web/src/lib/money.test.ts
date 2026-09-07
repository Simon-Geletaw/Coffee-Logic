import { describe, expect, it } from 'vitest';
import {
  currencyLabel,
  formatMoney,
  formatWeight,
  isCurrency,
  toCurrency,
} from './money';

describe('formatMoney', () => {
  it('renders ETB santim as birr with two decimals', () => {
    // Exact glyphs vary by ICU build; assert the parts that must hold.
    const text = formatMoney(65000, 'ETB');
    expect(text).toMatch(/650\.00/);
    expect(text).not.toMatch(/65,?000\.00/);
  });

  it('renders USD cents as dollars', () => {
    expect(formatMoney(1200, 'USD')).toBe('$12.00');
  });

  it('groups thousands', () => {
    expect(formatMoney(230000, 'USD')).toBe('$2,300.00');
  });

  it('handles zero', () => {
    expect(formatMoney(0, 'USD')).toBe('$0.00');
  });

  it('falls back to ETB for an unknown or null currency instead of throwing', () => {
    expect(() => formatMoney(100, null)).not.toThrow();
    expect(formatMoney(100, 'XYZ')).toEqual(formatMoney(100, 'ETB'));
  });
});

describe('currency helpers', () => {
  it('recognises only the supported codes', () => {
    expect(isCurrency('ETB')).toBe(true);
    expect(isCurrency('USD')).toBe(true);
    expect(isCurrency('usd')).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });

  it('toCurrency returns the fallback for anything else', () => {
    expect(toCurrency('EUR')).toBe('ETB');
    expect(toCurrency('EUR', 'USD')).toBe('USD');
  });

  it('exposes a short label per currency', () => {
    expect(currencyLabel('USD')).toBe('$');
    expect(currencyLabel('ETB')).toBe('Br');
  });
});

describe('formatWeight', () => {
  it('shows grams below a kilogram', () => {
    expect(formatWeight(250)).toBe('250 g');
  });

  it('switches to kilograms on exact multiples of 1000', () => {
    expect(formatWeight(1000)).toBe('1 kg');
    expect(formatWeight(2000)).toBe('2 kg');
  });

  it('keeps grams for non-round weights above a kilogram', () => {
    expect(formatWeight(1250)).toBe('1250 g');
  });
});
