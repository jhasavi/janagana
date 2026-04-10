'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGlobalSearch } from '@/hooks/useSearch';
import type { GlobalSearchResults } from '@/lib/types/search';

export default function DashboardSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const { data, isFetching, error } = useGlobalSearch(query);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
  };

  const resultCount = useMemo(() => {
    if (!data) return 0;
    return [data.events.length, data.clubs.length, data.opportunities.length, data.members.length, data.announcements.length].reduce((sum, value) => sum + value, 0);
  }, [data]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Global Search</h1>
          <p className="mt-2 text-sm text-muted-foreground">Search across events, clubs, volunteer opportunities, members, and announcements.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
          <Input
            placeholder="Search the tenant workspace..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" disabled={!query.trim()}>
            <Search className="mr-2 h-4 w-4" /> Search
          </Button>
        </form>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Search failed. Please try again.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isFetching && !data ? (
              <p className="text-sm text-muted-foreground">Searching...</p>
            ) : !query.trim() ? (
              <p className="text-sm text-muted-foreground">Enter a search query to find results.</p>
            ) : resultCount === 0 ? (
              <p className="text-sm text-muted-foreground">No matched results.</p>
            ) : (
              <div className="space-y-4">
                {data?.events.length ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">Events</h2>
                      <Badge>{data.events.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {data.events.map((event) => (
                        <Link
                          key={event.id}
                          href={`/dashboard/events/${event.id}`}
                          className="block rounded-xl border p-4 hover:border-primary/80 hover:bg-primary/5"
                        >
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">Starts {new Date(event.startsAt).toLocaleString()}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {data?.clubs.length ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">Clubs</h2>
                      <Badge>{data.clubs.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {data.clubs.map((club) => (
                        <Link
                          key={club.id}
                          href={`/dashboard/clubs/${club.id}`}
                          className="block rounded-xl border p-4 hover:border-primary/80 hover:bg-primary/5"
                        >
                          <p className="font-medium">{club.name}</p>
                          <p className="text-sm text-muted-foreground">{club.description ?? 'No description'}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {data?.opportunities.length ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">Volunteer Opportunities</h2>
                      <Badge>{data.opportunities.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {data.opportunities.map((opportunity) => (
                        <Link
                          key={opportunity.id}
                          href={`/dashboard/volunteers/opportunities/${opportunity.id}`}
                          className="block rounded-xl border p-4 hover:border-primary/80 hover:bg-primary/5"
                        >
                          <p className="font-medium">{opportunity.title}</p>
                          <p className="text-sm text-muted-foreground">{opportunity.location ?? 'Online / virtual'}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {data?.members.length ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">Members</h2>
                      <Badge>{data.members.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {data.members.map((member) => (
                        <Link
                          key={member.id}
                          href={`/dashboard/members/${member.id}`}
                          className="block rounded-xl border p-4 hover:border-primary/80 hover:bg-primary/5"
                        >
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {data?.announcements.length ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">Announcements</h2>
                      <Badge>{data.announcements.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {data.announcements.map((announcement) => (
                        <div key={announcement.id} className="rounded-xl border p-4">
                          <p className="font-medium">{announcement.title}</p>
                          <p className="text-sm text-muted-foreground">{announcement.status}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
