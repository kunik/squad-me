import type { Env } from "../env";
import type { AccountRow } from "./session";

/** Post-auth onboarding surface — computed by `handleMe`, not re-derived on the client. */
export type OnboardingStep = "profile" | "disciplines" | "email";

export type ProfileOnboardingRow = {
  profile_completed_at: string | null;
  pistol_enabled: number;
  carbine_enabled: number;
  pcc_mini_rifle_enabled: number;
  shotgun_enabled: number;
};

export type PromptDismissColumn =
  | "profile_prompt_dismissed_at"
  | "disciplines_prompt_dismissed_at"
  | "email_prompt_dismissed_at";

export function hasAnyEnabledDiscipline(
  profile: ProfileOnboardingRow | null | undefined,
): boolean {
  if (!profile) return false;
  return (
    profile.pistol_enabled === 1 ||
    profile.carbine_enabled === 1 ||
    profile.pcc_mini_rifle_enabled === 1 ||
    profile.shotgun_enabled === 1
  );
}

/**
 * Priority: profile → disciplines → email → null.
 * Profile done = dismissed OR profile_completed_at set.
 * Disciplines done = dismissed OR at least one discipline enabled
 *   (successful `section: "disciplines"` save also stamps dismissal).
 * Email done = dismissed OR accounts.email set.
 * Existing accounts with null prompt flags see each unfinished step once
 * (no backfill — simple default).
 */
export function computeOnboardingStep(
  account: AccountRow,
  profile: ProfileOnboardingRow | null | undefined,
): OnboardingStep | null {
  const needsProfile =
    account.profile_prompt_dismissed_at === null && !profile?.profile_completed_at;
  if (needsProfile) {
    return "profile";
  }
  const needsDisciplines =
    account.disciplines_prompt_dismissed_at === null && !hasAnyEnabledDiscipline(profile);
  if (needsDisciplines) {
    return "disciplines";
  }
  const needsEmail =
    account.email_prompt_dismissed_at === null && account.email === null;
  if (needsEmail) {
    return "email";
  }
  return null;
}

/** Idempotent: calling twice is fine — COALESCE keeps the first dismissal stamp. */
export async function dismissPrompt(
  env: Env,
  accountId: string,
  column: PromptDismissColumn,
): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE accounts SET ${column} = COALESCE(${column}, ?), updated_at = ? WHERE id = ?`,
  )
    .bind(now, now, accountId)
    .run();
}

export async function loadProfileOnboardingRow(
  env: Env,
  accountId: string,
): Promise<ProfileOnboardingRow | null> {
  return env.DB.prepare(
    `SELECT profile_completed_at,
            pistol_enabled, carbine_enabled, pcc_mini_rifle_enabled, shotgun_enabled
     FROM profiles WHERE account_id = ?`,
  )
    .bind(accountId)
    .first<ProfileOnboardingRow>();
}
