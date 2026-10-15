import {
  DEFAULT_PLATFORM_TIP_CHOICE,
  PLATFORM_TIP_PERCENT_OPTIONS,
  type PlatformTipChoice,
} from "@/lib/payments/fee-policy";

const OPTION_CLASS =
  "flex cursor-pointer items-center justify-center rounded-xl border border-input px-3 py-2 text-sm font-semibold text-foreground has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5";

/**
 * Optional tip to JanaGana, charged on top of the gift/dues/ticket and shown as
 * its own line at Stripe checkout. It never reduces what the organization receives.
 */
export function PlatformTipField({ defaultChoice = DEFAULT_PLATFORM_TIP_CHOICE }: { defaultChoice?: PlatformTipChoice }) {
  return (
    <fieldset className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <legend className="px-1 text-sm font-medium text-foreground">Optional: support JanaGana</legend>
      <p className="text-xs leading-5 text-muted-foreground">
        JanaGana is free for this organization — no platform fees. Tips keep it that way. Your tip is added on top
        and does not reduce what the organization receives. Choose &ldquo;No tip&rdquo; if you prefer.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PLATFORM_TIP_PERCENT_OPTIONS.map((pct) => (
          <label key={pct} className={OPTION_CLASS}>
            <input
              type="radio"
              name="platformTipChoice"
              value={String(pct)}
              defaultChecked={defaultChoice === String(pct)}
              className="sr-only"
            />
            {pct}%
          </label>
        ))}
        <label className={OPTION_CLASS}>
          <input type="radio" name="platformTipChoice" value="custom" defaultChecked={defaultChoice === "custom"} className="sr-only" />
          Custom
        </label>
        <label className={OPTION_CLASS}>
          <input type="radio" name="platformTipChoice" value="0" defaultChecked={defaultChoice === "0"} className="sr-only" />
          No tip
        </label>
      </div>
      <label className="mt-3 block text-xs font-medium text-muted-foreground">
        Custom tip (USD)
        <input
          name="platformTipCustomDollars"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 5"
          className="mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
        />
      </label>
    </fieldset>
  );
}
