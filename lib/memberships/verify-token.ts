import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Membership verification uses an opaque random token instead of the raw
 * membership id, so a guessable cuid scanned off a QR/wallet pass can't be
 * used to probe /api/membership-verify. Generated lazily on first use.
 */
export async function ensureMembershipVerifyToken(membershipId: string): Promise<string> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { verifyToken: true },
  });
  if (membership?.verifyToken) {
    return membership.verifyToken;
  }

  const token = randomBytes(24).toString("base64url");
  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { verifyToken: token },
    select: { verifyToken: true },
  });
  return updated.verifyToken!;
}
