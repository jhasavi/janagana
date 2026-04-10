'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, CalendarDays, Users, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

const STEPS = [
  { title: 'Complete your profile', description: 'Tell us a bit about yourself and upload a photo.' },
  { title: 'Browse upcoming events', description: 'Find something that fits your schedule.' },
  { title: 'Join a club or volunteer', description: 'Pick a way to get more involved.' },
];

export default function PortalWelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('Sam');
  const [role, setRole] = useState('Member');

  const next = () => setStep((prev) => Math.min(prev + 1, STEPS.length));
  const prev = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-slate-950 px-4 py-12 text-white">
      <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/95 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Welcome aboard</p>
          <h1 className="mt-4 text-4xl font-semibold">Let’s get you started</h1>
          <p className="mt-3 text-sm text-slate-300">A quick setup to help you begin with your membership, events, and clubs.</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Step {step} of {STEPS.length}</p>
                <h2 className="mt-2 text-xl font-semibold">{STEPS[step - 1].title}</h2>
              </div>
              <div className="rounded-2xl bg-slate-800 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                {['Profile', 'Events', 'Join'][step - 1]}
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-400">{STEPS[step - 1].description}</p>
            <div className="mt-5">
              <Progress value={(step / STEPS.length) * 100} />
            </div>
          </div>

          {step === 1 && (
            <div className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900 p-6">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
              </div>
              <div>
                <Label>How would you describe yourself?</Label>
                <select role="combobox" className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <option>Member</option>
                  <option>Volunteer</option>
                  <option>Club leader</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {['Weekend tournament', 'Volunteer open day', 'Networking brunch'].map((item) => (
                  <div key={item} className="rounded-3xl border border-border bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Upcoming</p>
                    <h3 className="mt-2 text-lg font-semibold">{item}</h3>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <div className="space-y-4">
                <div className="rounded-3xl border border-border bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Club to join</p>
                  <h3 className="mt-2 text-lg font-semibold">Community Outreach</h3>
                </div>
                <div className="rounded-3xl border border-border bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Volunteer role</p>
                  <h3 className="mt-2 text-lg font-semibold">Event setup crew</h3>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={prev} disabled={step === 1} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push('/portal')}>Skip setup</Button>
            <Button onClick={() => {
              if (step === STEPS.length) router.push('/portal'); else next();
            }} className="gap-2">
              {step === STEPS.length ? 'Go to dashboard' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
