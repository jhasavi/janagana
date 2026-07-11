import { CheckboxField } from "@/components/portal/checkbox-field";

export function AutoRenewField({ defaultChecked = true }: { defaultChecked?: boolean }) {
  return (
    <CheckboxField
      name="autoRenew"
      value="1"
      defaultChecked={defaultChecked}
      label="Auto-renew membership"
      hint="Recurring billing via Stripe — cancel anytime from your card issuer or contact the organizer."
    />
  );
}

export function RecurringDonationField() {
  return (
    <CheckboxField
      name="recurringMonthly"
      value="1"
      label="Make this a monthly gift"
      hint="Your card will be charged each month until you cancel. Same 0% JanaGana platform fee."
    />
  );
}
