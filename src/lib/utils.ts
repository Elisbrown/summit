import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { DEFAULT_CURRENCY, getCurrencyConfig } from "./currencies"

/**
 * Combines class names using clsx and tailwind-merge to handle conditional classes and conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with thousands separators and decimal places
 */
export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY, locale?: string): string {
  const config = getCurrencyConfig(currency);
  const targetLocale = locale || config.locale;
  
  const formatter = new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });
  
  return formatter.format(amount);
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number, locale?: string): string {
  const targetLocale = locale || getCurrencyConfig(DEFAULT_CURRENCY).locale;
  return new Intl.NumberFormat(targetLocale).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function generateInvoiceNumber(): string {
  const prefix = 'INV';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
}
