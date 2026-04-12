import { SignUp } from '@clerk/nextjs';
import { getCurrentTenant } from '@/lib/tenant';

export default async function SignUpPage() {
  const tenant = await getCurrentTenant();

  return (
    <div className="flex flex-col items-center gap-6">
      {tenant?.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tenant.logoUrl}
          alt={tenant.name}
          width={120}
          height={40}
          className="h-10 w-auto object-contain"
        />
      )}
      {!tenant?.logoUrl && (
        <p className="text-xl font-semibold tracking-tight">
          {tenant?.name ?? 'Jana Gana'}
        </p>
      )}
      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-md rounded-xl border border-border',
          },
          variables: {
            colorPrimary: tenant?.primaryColor ?? '#2563EB',
          },
        }}
        redirectUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
    </div>
  );
}
