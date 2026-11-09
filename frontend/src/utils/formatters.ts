/**
 * Format number into Indian Rupees (INR) with proper comma separators.
 * Example: 154000 -> "₹ 1,54,000"
 */
export function formatINR(amount: number | null | undefined, includeDecimals = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹ 0';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(absAmount);

  // Return standard space after currency symbol for clean typography
  const cleanCurrency = formatted.replace('₹', '₹ ');
  return isNegative ? `-${cleanCurrency}` : cleanCurrency;
}

/**
 * Format date in Indian Standard format: DD/MM/YYYY
 * Example: "09/11/2026"
 */
export function formatIndianDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format time in Indian Standard Time (IST): hh:mm AM/PM IST
 */
export function formatIndianTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return `${timeStr} IST`;
}

/**
 * Format full datetime: DD/MM/YYYY, hh:mm AM/PM IST
 */
export function formatIndianDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  return `${formatIndianDate(dateInput)}, ${formatIndianTime(dateInput)}`;
}

