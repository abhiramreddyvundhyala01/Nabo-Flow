// ===== Nabo Flow — Format Helpers =====

export const inr = (n: number): string =>
  '₹ ' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const inrCompact = (n: number): string => {
  if (n >= 10000000) return '₹ ' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹ ' + (n / 100000).toFixed(2) + ' L';
  if (n >= 1000) return '₹ ' + (n / 1000).toFixed(1) + 'K';
  return '₹ ' + n;
};

export const pct = (n: number): string =>
  (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

export const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

export function generateOrderId(dateInput?: Date | string): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const yyyymmdd = `${year}${month}${day}`;

  const storageKey = `nabo_order_counter_${yyyymmdd}`;
  let count = 1;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      count = parseInt(raw, 10) + 1;
    }
  } catch { /* ignore */ }

  try {
    localStorage.setItem(storageKey, String(count));
  } catch { /* ignore */ }

  const xxx = String(count).padStart(3, '0');
  return `ORD-${yyyymmdd}-${xxx}`;
}

export const uid = (prefix = 'id'): string => {
  if (prefix === 'ORD' || prefix === 'ord') {
    return generateOrderId();
  }
  return prefix + '-' + Math.random().toString(36).slice(2, 8);
};

export function generatePurchaseOrderId(dateInput?: Date | string): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const yyyymmdd = `${year}${month}${day}`;

  const storageKey = `nabo_po_counter_${yyyymmdd}`;
  let count = 1;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      count = parseInt(raw, 10) + 1;
    }
  } catch { /* ignore */ }

  try {
    localStorage.setItem(storageKey, String(count));
  } catch { /* ignore */ }

  const xxx = String(count).padStart(3, '0');
  return `PO-ORD-${yyyymmdd}-${xxx}`;
}

export const today = (): string => new Date().toISOString().slice(0, 10);
