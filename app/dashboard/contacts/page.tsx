import { redirect } from "next/navigation";

/** Alias route — nav label is "Contacts"; canonical path remains /dashboard/members. */
export default function ContactsAliasPage() {
  redirect("/dashboard/members");
}
