
export interface CurrencyConfig {
  value: string;
  label: string;
  locale: string;
  symbol: string;
  decimals: number;
}

export const currencies: CurrencyConfig[] = [
  { value: 'XAF', label: 'FCFA (Central African CFA Franc)', locale: 'fr-FR', symbol: 'FCFA', decimals: 0 },
  { value: 'XOF', label: 'FCFA (West African CFA Franc)', locale: 'fr-FR', symbol: 'FCFA', decimals: 0 },
  { value: 'USD', label: 'USD (US Dollar)', locale: 'en-US', symbol: '$', decimals: 2 },
  { value: 'EUR', label: 'EUR (Euro)', locale: 'fr-FR', symbol: '€', decimals: 2 },
  { value: 'GBP', label: 'GBP (British Pound)', locale: 'en-GB', symbol: '£', decimals: 2 },
  { value: 'JPY', label: 'JPY (Japanese Yen)', locale: 'ja-JP', symbol: '¥', decimals: 0 },
  { value: 'CAD', label: 'CAD (Canadian Dollar)', locale: 'en-CA', symbol: 'CA$', decimals: 2 },
  { value: 'AUD', label: 'AUD (Australian Dollar)', locale: 'en-AU', symbol: 'A$', decimals: 2 },
  { value: 'CHF', label: 'CHF (Swiss Franc)', locale: 'de-CH', symbol: 'CHF', decimals: 2 },
  { value: 'CNY', label: 'CNY (Chinese Yuan)', locale: 'zh-CN', symbol: '¥', decimals: 2 },
  { value: 'INR', label: 'INR (Indian Rupee)', locale: 'hi-IN', symbol: '₹', decimals: 2 },
  { value: 'SGD', label: 'SGD (Singapore Dollar)', locale: 'en-SG', symbol: 'S$', decimals: 2 },
  { value: 'IDR', label: 'IDR (Indonesian Rupiah)', locale: 'id-ID', symbol: 'Rp', decimals: 0 },
];

export const DEFAULT_CURRENCY = 'XAF';

export function getCurrencyConfig(currencyCode: string): CurrencyConfig {
  return currencies.find(c => c.value === currencyCode) || currencies[0];
}
