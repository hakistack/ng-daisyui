import { DataGridColumn } from '@hakistack/ng-daisyui';

/**
 * Sample data shared by the DataGrid (and DataGrid vs Table) demos.
 * Deterministic: the same seed always yields the same rows, so the docs look
 * identical on every reload and in screenshots. No network, no faker.
 */
export interface Invoice {
  id: number;
  number: string;
  customer: string;
  region: string;
  amount: number;
  issued: string;
  due: string;
  status: 'paid' | 'open' | 'overdue';
  paid: boolean;
  /** Optional monthly columns (`m1`…`mN`) used by the wide 100k × 32 demo. */
  [extra: `m${number}`]: number;
}

export const CUSTOMERS = [
  'Acme Corp',
  'Globex',
  'Initech',
  'Umbrella',
  'Hooli',
  'Stark Industries',
  'Wayne Enterprises',
  'Soylent',
  'Tyrell',
  'Cyberdyne',
];
export const REGIONS = ['North', 'South', 'East', 'West', 'Caribbean'];
export const STATUSES: Invoice['status'][] = ['paid', 'open', 'overdue'];

/** Deterministic pseudo-random invoices. `months` adds `m1`…`mN` number columns. */
export function generateInvoices(count: number, months = 0): Invoice[] {
  let seed = 42;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const day = 86_400_000;
  const start = Date.UTC(2024, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const issued = start + Math.floor(rand() * 600) * day;
    const status = STATUSES[Math.floor(rand() * 3)];
    const invoice = {
      id: i + 1,
      number: `INV-${String(i + 1).padStart(6, '0')}`,
      customer: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)],
      region: REGIONS[Math.floor(rand() * REGIONS.length)],
      amount: Math.round(rand() * 2_000_000) / 100,
      issued: new Date(issued).toISOString().slice(0, 10),
      due: new Date(issued + 30 * day).toISOString().slice(0, 10),
      status,
      paid: status === 'paid',
    } as Invoice;
    for (let m = 1; m <= months; m++) invoice[`m${m}`] = Math.round(rand() * 10_000);
    return invoice;
  });
}

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** The eight business columns every invoice demo shares. */
export const INVOICE_COLUMNS: DataGridColumn<Invoice>[] = [
  { field: 'number', header: 'Invoice', width: 130 },
  { field: 'customer', header: 'Customer', width: 180, description: 'Billed company' },
  { field: 'region', header: 'Region', width: 120, description: 'Sales region of the customer' },
  {
    field: 'amount',
    header: 'Amount',
    type: 'number',
    width: 130,
    format: (v) => currency.format(v as number),
    description: 'Invoice total in USD',
  },
  { field: 'issued', header: 'Issued', type: 'date', width: 120 },
  { field: 'due', header: 'Due', type: 'date', width: 120, description: 'Payment due date' },
  { field: 'status', header: 'Status', width: 110, description: 'paid, open or overdue' },
  { field: 'paid', header: 'Paid', type: 'boolean', width: 90, format: (v) => (v ? 'Yes' : 'No') },
];

const STATUS_BADGE: Record<Invoice['status'], string> = {
  paid: 'bg-success/10 border-success/20 text-success',
  open: 'bg-info/10 border-info/20 text-info',
  overdue: 'bg-error/10 border-error/20 text-error',
};

/** Soft, tinted badge classes for a status cell (theme tokens only). */
export function statusBadgeClass(status: unknown): string {
  return STATUS_BADGE[status as Invoice['status']] ?? '';
}

/** Read a JSON value from localStorage; `null` when missing, blocked or invalid. */
export function readStoredJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/** Write (or with `null`, remove) a JSON value in localStorage. Returns `false` when storage is blocked. */
export function writeStoredJson(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
