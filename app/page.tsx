import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

/**
 * Root route:
 * - Unauthenticated → /sign-in
 * - Authenticated → /dashboard (dashboard will handle org selection if needed)
 */
export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  redirect("/dashboard");
}
