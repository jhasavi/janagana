import { redirect } from "next/navigation";

export default function NewTierPage() {
  redirect("/dashboard/settings#pilot-scope");
}
