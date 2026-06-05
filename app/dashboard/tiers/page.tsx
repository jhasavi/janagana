import Link from "next/link";
import { redirect } from "next/navigation";

/** Paid membership tiers are not in the NB/TPW pilot. */
export default function TiersDeferredPage() {
  redirect("/dashboard/settings#pilot-scope");
}
