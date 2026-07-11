import { NextRequest, NextResponse } from "next/server";
import { consumeMemberSignInToken } from "@/lib/actions/member-auth";
import { applyMemberSessionCookieToResponse } from "@/lib/portal/member-session";

// Next.js's dev server normalizes request.url/request.nextUrl.origin to a fixed
// hostname regardless of the Host header the browser actually used, which would
// turn this redirect into a real cross-origin hop and silently drop the cookie
// we just set. Rebuild the origin from the incoming Host header instead.
function requestOrigin(request: NextRequest): string {
  const host = request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const token = request.nextUrl.searchParams.get("token")?.trim();
  const tenantSlug = request.nextUrl.searchParams.get("tenant")?.trim();

  if (!token || !tenantSlug) {
    return NextResponse.redirect(new URL("/portal", origin));
  }

  const result = await consumeMemberSignInToken(tenantSlug, token);

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/portal/${tenantSlug}/account/sign-in?error=invalid-link`, origin));
  }

  const response = NextResponse.redirect(new URL(`/portal/${result.tenantSlug}/account`, origin));
  return applyMemberSessionCookieToResponse(response, result.sessionToken);
}
