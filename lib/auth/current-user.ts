import { auth, currentUser } from "@clerk/nextjs/server";

export type CurrentUserSummary = {
  id: string;
  email: string | null;
  name: string | null;
};

export async function getCurrentUser(): Promise<CurrentUserSummary | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  if (!user) {
    return null;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    name: fullName.length > 0 ? fullName : user.username ?? null,
  };
}
