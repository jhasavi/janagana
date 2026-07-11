export function addMembershipInterval(
  date: Date,
  interval: "MONTHLY" | "ANNUAL" | "ONE_TIME",
): Date | null {
  if (interval === "ONE_TIME") return null;
  const next = new Date(date);
  if (interval === "MONTHLY") next.setMonth(next.getMonth() + 1);
  if (interval === "ANNUAL") next.setFullYear(next.getFullYear() + 1);
  return next;
}

export function extendMembershipExpiration(input: {
  currentExpiresAt: Date | null;
  interval: "MONTHLY" | "ANNUAL" | "ONE_TIME";
  from?: Date;
}): Date | null {
  const base = input.currentExpiresAt && input.currentExpiresAt > new Date()
    ? input.currentExpiresAt
    : (input.from ?? new Date());
  return addMembershipInterval(base, input.interval);
}
