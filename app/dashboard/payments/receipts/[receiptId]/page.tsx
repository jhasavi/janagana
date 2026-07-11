import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/dashboard/print-button";
import { getReceiptForOperator } from "@/lib/actions/receipts";
import { formatCents, formatDate } from "@/lib/utils";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const { receiptId } = await params;
  const result = await getReceiptForOperator(receiptId);

  if (!result.ok || !result.data) {
    notFound();
  }

  const receipt = result.data;
  const payerName =
    receipt.recipientName ??
    [receipt.contact?.firstName, receipt.contact?.lastName].filter(Boolean).join(" ") ??
    "Anonymous";

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/dashboard/payments" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to payments
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border/70 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Receipt</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">{receipt.tenant.name}</h1>
            {receipt.tenant.publicContactEmail && (
              <p className="mt-1 text-sm text-muted-foreground">{receipt.tenant.publicContactEmail}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-foreground">{receipt.receiptNumber}</p>
            <p className="text-xs text-muted-foreground">Issued {formatDate(receipt.issuedAt)}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Row label="Received from" value={payerName} />
          <Row label="Email" value={receipt.recipientEmail} />
          <Row label="Description" value={receipt.description} />
          {receipt.membership?.tier?.name && <Row label="Membership plan" value={receipt.membership.tier.name} />}
          {receipt.payment?.method && <Row label="Payment method" value={receipt.payment.method.replace(/_/g, " ")} />}
          {receipt.payment?.paidAt && <Row label="Date paid" value={formatDate(receipt.payment.paidAt)} />}
        </div>

        <div className="mt-8 flex items-center justify-between rounded-2xl bg-primary/5 px-5 py-4">
          <p className="text-sm font-bold text-foreground">Amount</p>
          <p className="text-2xl font-extrabold text-foreground">{formatCents(receipt.amountCents)}</p>
        </div>

        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          Thank you for supporting {receipt.tenant.name}. Please retain this receipt for your records. If your gift or
          payment qualifies for a tax deduction, consult your tax advisor — {receipt.tenant.name} did not provide goods
          or services in exchange for this contribution unless noted above.
        </p>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}
