import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border bg-card p-10 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Register</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Start your OrgFlow community.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Create your account and begin publishing member experiences, events, volunteers, and clubs.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/sign-up">Sign up</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/features">See features</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
