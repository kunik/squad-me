import type { Env } from "../env";
import {
  emptyNormalizedProfile,
  mergeProfilePatch,
  normalizeProfileInput,
  normalizeProfileSection,
  parseProfileSection,
  profileRowToNormalized,
  profileView,
  shouldMarkProfileCompleted,
  ProfileValidationError,
  type NormalizedProfile,
  type ProfileInput,
  type ProfileRow,
} from "./profile";
import { dismissPrompt } from "./onboarding";

function bindProfileUpsert(
  accountId: string,
  input: NormalizedProfile,
  profileCompletedAt: string | null,
  now: string,
): unknown[] {
  return [
    crypto.randomUUID(),
    accountId,
    input.firstNameUa,
    input.lastNameUa,
    input.firstNameEn,
    input.lastNameEn,
    input.nickname,
    input.gender,
    input.birthDate,
    input.upsfMember ? 1 : 0,
    input.region,
    input.city,
    input.club,
    input.ipscMember ? 1 : 0,
    input.ipscMemberNumber,
    input.ipscRegion,
    input.pistol.enabled ? 1 : 0,
    input.pistol.division,
    input.pistol.powerFactor,
    input.carbine.enabled ? 1 : 0,
    input.carbine.division,
    input.carbine.powerFactor,
    input.pccMiniRifle.enabled ? 1 : 0,
    input.pccMiniRifle.division,
    input.pccMiniRifle.powerFactor,
    input.shotgun.enabled ? 1 : 0,
    input.shotgun.division,
    input.shotgun.powerFactor,
    profileCompletedAt,
    now,
    now,
  ];
}

const PROFILE_UPSERT_SQL = `INSERT INTO profiles (
       id, account_id, first_name_ua, last_name_ua, first_name_en, last_name_en,
       nickname, gender, birth_date, upsf_member, region, city, club,
       ipsc_member, ipsc_member_number, ipsc_region,
       pistol_enabled, pistol_division, pistol_power_factor,
       carbine_enabled, carbine_division, carbine_power_factor,
       pcc_mini_rifle_enabled, pcc_mini_rifle_division, pcc_mini_rifle_power_factor,
       shotgun_enabled, shotgun_division, shotgun_power_factor,
       profile_completed_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(account_id) DO UPDATE SET
       first_name_ua = excluded.first_name_ua,
       last_name_ua = excluded.last_name_ua,
       first_name_en = excluded.first_name_en,
       last_name_en = excluded.last_name_en,
       nickname = excluded.nickname,
       gender = excluded.gender,
       birth_date = excluded.birth_date,
       upsf_member = excluded.upsf_member,
       region = excluded.region,
       city = excluded.city,
       club = excluded.club,
       ipsc_member = excluded.ipsc_member,
       ipsc_member_number = excluded.ipsc_member_number,
       ipsc_region = excluded.ipsc_region,
       pistol_enabled = excluded.pistol_enabled,
       pistol_division = excluded.pistol_division,
       pistol_power_factor = excluded.pistol_power_factor,
       carbine_enabled = excluded.carbine_enabled,
       carbine_division = excluded.carbine_division,
       carbine_power_factor = excluded.carbine_power_factor,
       pcc_mini_rifle_enabled = excluded.pcc_mini_rifle_enabled,
       pcc_mini_rifle_division = excluded.pcc_mini_rifle_division,
       pcc_mini_rifle_power_factor = excluded.pcc_mini_rifle_power_factor,
       shotgun_enabled = excluded.shotgun_enabled,
       shotgun_division = excluded.shotgun_division,
       shotgun_power_factor = excluded.shotgun_power_factor,
       profile_completed_at = CASE
         WHEN excluded.profile_completed_at IS NOT NULL THEN excluded.profile_completed_at
         ELSE profiles.profile_completed_at
       END,
       updated_at = excluded.updated_at`;

export async function getProfileRow(
  env: Env,
  accountId: string,
): Promise<ProfileRow | null> {
  return env.DB.prepare(`SELECT * FROM profiles WHERE account_id = ?`)
    .bind(accountId)
    .first<ProfileRow>();
}

/**
 * Writes a normalized profile document (full or sectional merge already applied).
 * Successful `section: "disciplines"` also stamps disciplines-prompt dismissal.
 */
export async function upsertNormalizedProfile(
  env: Env,
  accountId: string,
  input: NormalizedProfile,
  sectionKey: ReturnType<typeof parseProfileSection>,
): Promise<ProfileRow> {
  const now = new Date().toISOString();
  const profileCompletedAt = shouldMarkProfileCompleted(sectionKey, input) ? now : null;

  await env.DB.prepare(PROFILE_UPSERT_SQL)
    .bind(...bindProfileUpsert(accountId, input, profileCompletedAt, now))
    .run();

  if (sectionKey === "disciplines") {
    await dismissPrompt(env, accountId, "disciplines_prompt_dismissed_at");
  }

  const profile = await getProfileRow(env, accountId);
  return profile!;
}

export type ProfileUpsertResult =
  | { ok: true; profile: ReturnType<typeof profileView> }
  | { ok: false; error: "invalid_request" | "invalid_profile"; field?: string };

/** Parses body, merges sectional patches, upserts, returns API view. */
export async function upsertProfileFromInput(
  env: Env,
  accountId: string,
  body: ProfileInput,
): Promise<ProfileUpsertResult> {
  let input: NormalizedProfile;
  let sectionKey: ReturnType<typeof parseProfileSection> = null;

  try {
    sectionKey = parseProfileSection(body.section);
    if (sectionKey) {
      const existing = await getProfileRow(env, accountId);
      const base = existing ? profileRowToNormalized(existing) : emptyNormalizedProfile();
      const patch = normalizeProfileSection(body);
      input = mergeProfilePatch(base, patch);
    } else {
      input = normalizeProfileInput(body);
    }
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      return { ok: false, error: "invalid_profile", field: err.field };
    }
    throw err;
  }

  const row = await upsertNormalizedProfile(env, accountId, input, sectionKey);
  return { ok: true, profile: profileView(row) };
}

/** Registration bootstrap: nickname-only sectional upsert (does not complete onboarding). */
export async function upsertNicknameOnly(
  env: Env,
  accountId: string,
  nickname: string,
): Promise<ProfileUpsertResult> {
  return upsertProfileFromInput(env, accountId, { section: "nickname", nickname });
}
