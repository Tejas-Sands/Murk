import deployed from './deployed_objects.json';

export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || deployed.packageId || '0x0';
export const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID || deployed.registryId || '0x0';
export const CLOCK_ID = '0x6';

export const INVOICE_STATUS = {
  PENDING: 0,
  SETTLED: 1,
  CANCELLED: 2,
  EXPIRED: 3,
} as const;

export type InvoiceStatusType = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];

export const STATUS_LABELS = {
  0: 'Pending',
  1: 'Settled',
  2: 'Cancelled',
  3: 'Expired',
} as const;

export const STATUS_COLORS = {
  0: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  1: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  2: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  3: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
} as const;
