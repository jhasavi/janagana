import { SupportRequestForm } from '@/components/help/support-request-form'

export default function HelpReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Report an issue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tell us about the problem you encountered and we&apos;ll follow up with a solution.
        </p>
      </div>
      <SupportRequestForm contextLabel="help:report" />
    </div>
  )
}
