import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  // Clerk JWKS endpoint — used to verify tokens issued by Clerk
  clerkJwksUrl: process.env.CLERK_JWKS_URL ?? 'https://api.clerk.com/.well-known/jwks.json',
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  // Fallback symmetric secret for internal service-to-service tokens (not Clerk tokens)
  secret: process.env.JWT_SECRET ?? '',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));

export type JwtConfig = ReturnType<typeof jwtConfig>;
