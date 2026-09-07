export function formatCurrency(value: number, intlLocale = 'fr-FR') {
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}
