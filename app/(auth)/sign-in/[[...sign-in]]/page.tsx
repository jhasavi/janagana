import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-8 text-lg font-extrabold tracking-tight text-foreground">
        JanaGana
      </Link>
      <SignIn />
    </main>
  );
}
