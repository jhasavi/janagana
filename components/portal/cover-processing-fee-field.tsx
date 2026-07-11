import { coverProcessingFeeLabel } from "@/lib/payments/fee-policy";

export function CoverProcessingFeeField({ baseCents }: { baseCents?: number }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
      <input type="checkbox" name="coverProcessingFee" value="1" className="mt-0.5 h-4 w-4 rounded border-input" />
      <span>
        <span className="font-medium">{coverProcessingFeeLabel(baseCents ?? 0)}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          100% of your intended amount goes to the organization. JanaGana still charges no platform fee.
        </span>
      </span>
    </label>
  );
}
