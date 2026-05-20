import { SignIn } from '@clerk/nextjs'

const brandName = process.env.PLATFORM_BRAND_NAME ?? process.env.TENANT_BRAND_NAME ?? 'Platform'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">{brandName}</h1>
          <p className="text-slate-400 mt-2">Membership & Event Management</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-2xl',
            },
          }}
        />
      </div>
    </div>
  )
}
