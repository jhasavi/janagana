import { COMMUNITY_OS_NAV, PILOT_DASHBOARD_NAV } from "@/lib/pilot/dashboard-nav";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const requiredLabels = [
  "Dashboard",
  "Contacts",
  "Families",
  "Memberships",
  "Renewals",
  "Events",
  "Donations",
  "Sponsors",
  "Volunteers",
  "Payments",
  "Communications",
  "Settings",
];

const flat = COMMUNITY_OS_NAV.flatMap((group) => group.items);
const labels = flat.map((item) => item.label);
const hrefs = flat.map((item) => item.href);

for (const label of requiredLabels) {
  assert(labels.includes(label), `Missing nav label: ${label}`);
}

assert(new Set(hrefs).size === hrefs.length, "Duplicate nav hrefs");
assert(PILOT_DASHBOARD_NAV.length === flat.length, "PILOT_DASHBOARD_NAV should match flattened COMMUNITY_OS_NAV");

const comingSoon = flat.filter((item) => item.status === "coming-soon");
assert(hrefs.includes("/dashboard/donations"), "Nav must include donations");
assert(comingSoon.length >= 4, "Expected at least 4 coming-soon modules");

console.log("Community OS navigation checks passed:");
console.log(`- ${flat.length} nav items across ${COMMUNITY_OS_NAV.length} groups`);
console.log(`- ${comingSoon.length} coming-soon: ${comingSoon.map((item) => item.label).join(", ")}`);
