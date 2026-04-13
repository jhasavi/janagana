// Temporarily disabled to debug production 500 error
// import { authMiddleware } from '@clerk/nextjs/server'

// export default authMiddleware({
//   publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)', '/onboarding(.*)', '/api/webhooks(.*)'],
// })

export default function middleware(request: Request) {
  return
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
