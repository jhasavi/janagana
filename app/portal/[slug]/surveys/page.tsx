import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardCheck, ChevronRight, Lock } from 'lucide-react'
import { getPortalContext } from '@/lib/actions/portal'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PortalSurveysPage({ params }: Props) {
  const { slug } = await params
  const ctx = await getPortalContext(slug)
  if (!ctx) redirect('/sign-in')

  const now = new Date()
  const surveys = await prisma.survey.findMany({
    where: {
      tenantId: ctx.tenant.id,
      isPublished: true,
    },
    include: {
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Surveys</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Share your thoughts and help us improve.
        </p>
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No surveys available right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {surveys.map((survey) => {
            const isClosed = survey.closesAt && survey.closesAt < now
            return (
              <Card key={survey.id} className={isClosed ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{survey.title}</p>
                      {isClosed && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Closed
                        </Badge>
                      )}
                      {survey.isAnonymous && (
                        <Badge variant="outline" className="text-xs">Anonymous</Badge>
                      )}
                    </div>
                    {survey.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                        {survey.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {survey._count.questions} question{survey._count.questions !== 1 ? 's' : ''}
                      {survey.closesAt && !isClosed && (
                        <> · Closes {survey.closesAt.toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  {!isClosed && (
                    <Link
                      href={`/portal/${slug}/surveys/${survey.id}`}
                      className="flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
                    >
                      Take Survey <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
