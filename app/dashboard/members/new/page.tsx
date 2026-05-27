import { redirect } from "next/navigation";

export default function NewMemberPage() {
  redirect("/dashboard/members");
}
