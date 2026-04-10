import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const features = [
  {
    title: 'Public event pages',
    description: 'Share published events with your community and let guests sign up online.',
  },
  {
    title: 'Member portal',
    description: 'Give your members one place to manage profiles, registrations, and participation.',
  },
  {
    title: 'Volunteer coordination',
    description: 'Create volunteer opportunities and keep assignments organized.',
  },
  {
    title: 'Clubs and teams',
    description: 'Run student clubs, committees, and interest groups with dedicated spaces.',
  },
  {
    title: 'Branded experience',
    description: 'Customize logos, colors, and domains for each tenant community.',
  },
  {
    title: 'Analytics and insights',
    description: 'Understand attendance, membership growth, and volunteer hours.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Features</p>
        <h1 className="text-4xl font-bold tracking-tight">Everything your community needs.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          OrgFlow helps your team publish events, onboard members, coordinate volunteers, and keep clubs thriving.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">{feature.title}</h2>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-3xl border border-border bg-card p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Get started</p>
            <h2 className="mt-3 text-3xl font-semibold">Launch a branded community site today.</h2>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Fast setup</Badge>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
