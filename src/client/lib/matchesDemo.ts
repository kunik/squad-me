/** Match role on a specific event (KB screens/dashboard.md). */
export type MatchRole = "org" | "federation_rep" | "shooter";

export type DemoMatch = {
  id: string;
  name: string;
  club: string;
  startsAt: string;
  endsAt: string;
  role: MatchRole;
  status: "upcoming" | "past";
};

/**
 * Static demo matches for the redesign (no matches backend yet).
 * Shape: 2 upcoming + 1 past per KB dashboard.md.
 */
export const DEMO_MATCHES: readonly DemoMatch[] = [
  {
    id: "m-upcoming-1",
    name: "Кубок Карпат 2026",
    club: "ССК Барвінок",
    startsAt: "2026-08-15",
    endsAt: "2026-08-16",
    role: "org",
    status: "upcoming",
  },
  {
    id: "m-upcoming-2",
    name: "IPSC Level II — Autumn Open",
    club: "Kyiv Practical",
    startsAt: "2026-09-12",
    endsAt: "2026-09-13",
    role: "shooter",
    status: "upcoming",
  },
  {
    id: "m-past-1",
    name: "Spring Classifier Day",
    club: "ССК Барвінок",
    startsAt: "2026-04-04",
    endsAt: "2026-04-04",
    role: "federation_rep",
    status: "past",
  },
];

export function formatMatchDates(startsAt: string, endsAt: string, locale: string): string {
  const start = new Date(`${startsAt}T12:00:00`);
  const end = new Date(`${endsAt}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const startLabel = start.toLocaleDateString(locale === "en" ? "en-GB" : "uk-UA", opts);
  if (startsAt === endsAt) return startLabel;
  const endLabel = end.toLocaleDateString(locale === "en" ? "en-GB" : "uk-UA", opts);
  return `${startLabel} – ${endLabel}`;
}
