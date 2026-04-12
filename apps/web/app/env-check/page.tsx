export default function EnvCheckPage() {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'NOT SET';
  const clerkKeyPreview = clerkKey.length > 20 ? clerkKey.substring(0, 20) + '...' : clerkKey;
  const hasSecretKey = !!process.env.CLERK_SECRET_KEY;

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Environment Variables Check</h1>
        <p className="text-muted-foreground">This page helps verify Vercel has the correct environment variables.</p>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</h2>
            <p className="font-mono text-sm bg-muted p-2 rounded">{clerkKeyPreview}</p>
            <p className="text-xs text-muted-foreground mt-1">Status: {clerkKey ? 'SET' : 'NOT SET'}</p>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">CLERK_SECRET_KEY</h2>
            <p className="font-mono text-sm bg-muted p-2 rounded">{hasSecretKey ? 'yes' : 'no'}</p>
            <p className="text-xs text-muted-foreground mt-1">Status: {hasSecretKey ? 'SET' : 'NOT SET'}</p>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">NEXT_PUBLIC_API_URL</h2>
            <p className="font-mono text-sm bg-muted p-2 rounded">{process.env.NEXT_PUBLIC_API_URL || 'NOT SET'}</p>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">NEXT_PUBLIC_APP_URL</h2>
            <p className="font-mono text-sm bg-muted p-2 rounded">{process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'}</p>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">NODE_ENV</h2>
            <p className="font-mono text-sm bg-muted p-2 rounded">{process.env.NODE_ENV || 'NOT SET'}</p>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">NEXT_PUBLIC_APP_DOMAIN</h2>
            <p className="font-mono text-sm bg-muted p-2 rounded">{process.env.NEXT_PUBLIC_APP_DOMAIN || 'NOT SET'}</p>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">NEXT_PUBLIC_APP_NAME</h2>
            <p className="font-mono text-sm bg-muted p-2 rounded">{process.env.NEXT_PUBLIC_APP_NAME || 'NOT SET'}</p>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>IMPORTANT:</strong> Delete this page after debugging. It exposes environment variable information.
          </p>
        </div>
      </div>
    </div>
  );
}
