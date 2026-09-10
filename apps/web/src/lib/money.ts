/**
 * Money formatting for the storefront.
 *
 * Prices are stored as integer minor units (`priceCents`) alongside the
 * currency the amount is denominated in — ETB stores santim, USD stores cents.
 * Every price the shop renders goes through `formatMoney` so adding a third
 * currency, or switching the display locale, is a change in one place.
 */

export const SUPPORTED_CURRENCIES = ['ETB', 'USD'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = 'ETB';

type CurrencyConfig = {
  /** Locale used for digit grouping and decimal separators. */
  locale: string;
  /** How many minor units make one major unit, as a power of ten. */
  fractionDigits: number;
  /** Short label used in filter chips and currency switches. */
  label: string;
};

const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  ETB: { locale: 'en-ET', fractionDigits: 2, label: 'Br' },
  USD: { locale: 'en-US', fractionDigits: 2, label: '$' },
};

export function isCurrency(value: unknown): value is Currency {
  return (
    typeof value === 'string' &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  );
}

export function toCurrency(value: unknown, fallback: Currency = DEFAULT_CURRENCY): Currency {
  return isCurrency(value) ? value : fallback;
}

/** `formatMoney(24500, 'ETB')` -> `Br 245.00`. */
export function formatMoney(minorUnits: number, currency: unknown): string {
  const resolved = toCurrency(currency);
  const config = CURRENCY_CONFIG[resolved];
  const major = minorUnits / 10 ** config.fractionDigits;

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: resolved,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: config.fractionDigits,
      maximumFractionDigits: config.fractionDigits,
    }).format(major);
  } catch {
    // Older runtimes reject narrowSymbol or an unknown locale; the symbol
    // prefix keeps the price readable rather than throwing mid-render.
    return `${config.label} ${major.toFixed(config.fractionDigits)}`;
  }
}

export function currencyLabel(currency: unknown): string {
  return CURRENCY_CONFIG[toCurrency(currency)].label;
}

/** `formatWeight(250)` -> `250 g`, `formatWeight(1000)` -> `1 kg`. */
export function formatWeight(grams: number): string {
  if (grams >= 1000 && grams % 1000 === 0) {
    return `${grams / 1000} kg`;
  }
  return `${grams} g`;
}
