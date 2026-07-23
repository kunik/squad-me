import { useState } from "react";
import { AccountShell } from "../components/AccountShell";
import { Badge } from "../components/ui/Badge";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { useLocale } from "../locale";
import {
  DEMO_MATCHES,
  formatMatchDates,
  type DemoMatch,
  type MatchRole,
} from "../lib/matchesDemo";

/** Authenticated home — «Мої матчі» (Gentelella dashboard card grid + mock data). */
export function MatchesPage() {
  const { locale, t } = useLocale();
  // Mock: show "+ Новий матч" as if the user has a club org grant.
  const [canCreateMatch] = useState(true);
  const upcoming = DEMO_MATCHES.filter((m) => m.status === "upcoming");
  const past = DEMO_MATCHES.filter((m) => m.status === "past");
  const [featured, ...restUpcoming] = upcoming;
  const isEmpty = upcoming.length === 0 && past.length === 0;

  const createMatchButton = canCreateMatch ? (
    <button type="button" className="btn btn-primary" disabled title={t.profileMatchesComingSoon}>
      {t.matchesNewMatch}
    </button>
  ) : null;

  return (
    <AccountShell>
      {isEmpty ? (
        <Card>
          <CardBody>
            <EmptyState
              title={t.matchesEmptyTitle}
              description={t.matchesEmptyBody}
              action={createMatchButton}
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {createMatchButton ? <div className="page-actions page-actions--inline">{createMatchButton}</div> : null}

          {featured ? (
            <div className="row col-1">
              <MatchCard match={featured} locale={locale} featured />
            </div>
          ) : null}

          {restUpcoming.length > 0 ? (
            <div className="row col-3">
              {restUpcoming.map((match) => (
                <MatchCard key={match.id} match={match} locale={locale} />
              ))}
            </div>
          ) : null}

          {past.length > 0 ? (
            <section aria-labelledby="matches-past-heading">
              <h2 id="matches-past-heading" className="matches-section-label">
                {t.matchesPastSection}
              </h2>
              <div className="row col-3">
                {past.map((match) => (
                  <MatchCard key={match.id} match={match} locale={locale} muted />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </AccountShell>
  );
}

function MatchCard({
  match,
  locale,
  featured = false,
  muted = false,
}: {
  match: DemoMatch;
  locale: string;
  featured?: boolean;
  muted?: boolean;
}) {
  const { t } = useLocale();
  const mods = [
    "match-card",
    featured ? "is-featured" : "",
    muted ? "is-past" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className={mods}>
      <CardBody>
        <Badge tone={roleTone(match.role)}>{roleLabel(match.role, t)}</Badge>
        <h3 className="match-name">{match.name}</h3>
        <p className="match-club">{match.club}</p>
        <div className="match-meta">
          <span>
            <span className="k">{t.matchesDatesLabel} </span>
            {formatMatchDates(match.startsAt, match.endsAt, locale)}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

function roleTone(role: MatchRole) {
  if (role === "org") return "accent" as const;
  if (role === "federation_rep") return "info" as const;
  return "neutral" as const;
}

function roleLabel(role: MatchRole, t: ReturnType<typeof useLocale>["t"]): string {
  if (role === "org") return t.matchesRoleOrg;
  if (role === "federation_rep") return t.matchesRoleFed;
  return t.matchesRoleShooter;
}
