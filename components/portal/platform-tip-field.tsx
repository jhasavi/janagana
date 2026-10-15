import {
  DEFAULT_PLATFORM_TIP_CHOICE,
  PLATFORM_TIP_PRESET_CENTS,
  type PlatformTipChoice,
} from "@/lib/payments/fee-policy";
import { formatMoneyCents } from "@/lib/utils";

const OPTION_CLASS =
  "flex cursor-pointer items-center justify-center rounded-xl border border-input px-3 py-2 text-sm font-semibold text-foreground has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5";

/**
 * Opt-in donation to JanaGana. "No thanks" is pre-selected, so nothing is added
 * unless the donor clicks an amount. It appears as its own line at Stripe
 * checkout and never changes what the organization receives.
 */
export function PlatformTipField({ defaultChoice = DEFAULT_PLATFORM_TIP_CHOICE }: { defaultChoice?: PlatformTipChoice }) {
  return (
    <fieldset className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <legend className="px-1 text-sm font-medium text-foreground">Want to add a small donation to JanaGana?</legend>
      <p className="text-xs leading-5 text-muted-foreground">
        This organization uses JanaGana for free. If you&apos;d like to help keep it free for community groups, you can
        add a small separate donation. It&apos;s entirely optional and doesn&apos;t change your payment to the
        organization.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className={OPTION_CLASS}>
          <input type="radio" name="platformTipChoice" value="0" defaultChecked={defaultChoice === "0"} className="sr-only" />
          No thanks
        </label>
        {PLATFORM_TIP_PRESET_CENTS.map((cents) => (
          <label key={cents} className={OPTION_CLASS}>
            <input
              type="radio"
              name="platformTipChoice"
              value={String(cents)}
              defaultChecked={defaultChoice === String(cents)}
              className="sr-only"
            />
            Add {formatMoneyCents(cents)}
          </label>
        ))}
        <label className={OPTION_CLASS}>
          <input type="radio" name="platformTipChoice" value="custom" defaultChecked={defaultChoice === "custom"} className="sr-only" />
          Other amount
        </label>
      </div>
      <label className="mt-3 block text-xs font-medium text-muted-foreground">
        Other amount (USD, only used if you pick &ldquo;Other amount&rdquo;)
        <input
          name="platformTipCustomDollars"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 3"
          className="mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
        />
      </label>
    </fieldset>
  );
}
