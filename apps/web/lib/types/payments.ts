export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type PaymentType = 'membership' | 'event' | 'saas';
export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';

export interface PaymentRecord {
  id: string;
  memberId: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  paidAt: string | null;
}

export interface PaymentStats {
  mrrCents: number;
  totalRevenueCents: number;
  monthRevenueCents: number;
  outstandingCents: number;
  chart: Array<{ month: string; amount: number }>;
}

export interface InvoiceItemRecord {
  id: string;
  description: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  memberId: string | null;
  status: InvoiceStatus;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  notes: string | null;
  items: InvoiceItemRecord[];
}

export interface ConnectStatus {
  isConnected: boolean;
  accountId: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  dashboardUrl: string | null;
}

export interface CreateCheckoutPayload {
  type: 'membership' | 'event';
  memberId: string;
  tierId?: string;
  eventId?: string;
  tickets?: Array<{ ticketId: string; quantity: number }>;
  billingInterval?: 'MONTHLY' | 'ANNUAL';
}

export interface CreateInvoicePayload {
  memberId: string;
  items: Array<{ description: string; quantity: number; unitCents: number }>;
  notes?: string;
  dueDate?: string;
}

export interface RefundPayload {
  amountCents?: number;
  reason?: string;
}
