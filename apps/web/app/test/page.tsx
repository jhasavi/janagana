export default function TestPage() {
  return (
    <html>
      <body>
        <h1>Jana Gana - Test Page</h1>
        <p>If you see this, Next.js is working.</p>
        <p>Environment check:</p>
        <ul>
          <li>Clerk Key exists: {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'YES' : 'NO'}</li>
          <li>API URL: {process.env.NEXT_PUBLIC_API_URL || 'not set'}</li>
          <li>Node ENV: {process.env.NODE_ENV}</li>
        </ul>
      </body>
    </html>
  )
}
