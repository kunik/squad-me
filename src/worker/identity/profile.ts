/**
 * Shooter `Profile` entity — separate from `Account`, 1:1 via `account_id`.
 * See migrations/0003–0008 and docs/plans/auth-registration-plan.md.
 *
 * `POST /api/profile` supports aggregate `profile` / `disciplines` merges and
 * narrow section patches. `section: "nickname"` is the registration bootstrap
 * and must never overwrite an existing account's other profile fields.
 *
 * When UPSF/IPSC membership or a discipline is off, nested fields are cleared
 * on save.
 */

import {
  CITY_MAX_LENGTH,
  CLUB_MAX_LENGTH,
  CONTROL_CHAR_RE,
  IPSC_MEMBER_NUMBER_MAX_LENGTH,
  IPSC_REGION_MAX_LENGTH,
  LATIN_NAME_RE,
  MAX_AGE_YEARS,
  NAME_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  NICKNAME_RE,
  REGION_MAX_LENGTH,
  UA_NAME_RE,
  isValidBirthDate as sharedIsValidBirthDate,
} from "../../shared/profileValidation";
import {
  DISCIPLINE_DEFAULT_POWER_FACTOR,
  isDivisionFor,
  isPowerFactor,
  type DisciplineKey,
  type PowerFactor,
} from "./disciplines";

/** Defensive length caps on free-text fields — same spirit as password.ts's 128-char guard. */
export {
  NAME_MAX_LENGTH,
  CITY_MAX_LENGTH,
  REGION_MAX_LENGTH,
  CLUB_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  IPSC_MEMBER_NUMBER_MAX_LENGTH,
  IPSC_REGION_MAX_LENGTH,
  MAX_AGE_YEARS,
};

export type Gender = "male" | "female";
export const PROFILE_SECTIONS = [
  "profile",
  "disciplines",
  "nickname",
  "birth_gender",
  "upsf",
  "ipsc",
  "discipline_pistol",
  "discipline_carbine",
  "discipline_pcc",
  "discipline_shotgun",
] as const;

export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export class ProfileValidationError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "ProfileValidationError";
    this.field = field;
  }
}

export type DisciplineBlockInput = {
  enabled?: unknown;
  division?: unknown;
  powerFactor?: unknown;
};

export type ProfileInput = {
  section?: unknown;
  firstNameUa?: unknown;
  lastNameUa?: unknown;
  firstNameEn?: unknown;
  lastNameEn?: unknown;
  nickname?: unknown;
  gender?: unknown;
  birthDate?: unknown;
  upsfMember?: unknown;
  region?: unknown;
  city?: unknown;
  club?: unknown;
  ipscMember?: unknown;
  ipscMemberNumber?: unknown;
  ipscRegion?: unknown;
  /** Discipline blocks — used with section=discipline_* or legacy full body. */
  pistol?: DisciplineBlockInput;
  carbine?: DisciplineBlockInput;
  pccMiniRifle?: DisciplineBlockInput;
  shotgun?: DisciplineBlockInput;
  /** Flat discipline fields (section payload convenience). */
  enabled?: unknown;
  division?: unknown;
  powerFactor?: unknown;
};

export type DisciplineBlock = {
  enabled: boolean;
  division: string | null;
  powerFactor: PowerFactor | null;
};

export type NormalizedProfile = {
  firstNameUa: string | null;
  lastNameUa: string | null;
  firstNameEn: string | null;
  lastNameEn: string | null;
  nickname: string | null;
  gender: Gender | null;
  birthDate: string | null;
  upsfMember: boolean;
  region: string | null;
  city: string | null;
  club: string | null;
  ipscMember: boolean;
  ipscMemberNumber: string | null;
  ipscRegion: string | null;
  pistol: DisciplineBlock;
  carbine: DisciplineBlock;
  pccMiniRifle: DisciplineBlock;
  shotgun: DisciplineBlock;
};

function fail(field: string, message: string): never {
  throw new ProfileValidationError(field, message);
}

function optionalString(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    fail(field, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > maxLength) {
    fail(field, `${field} exceeds max length ${maxLength}`);
  }
  return trimmed;
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  const trimmed = optionalString(value, field, maxLength);
  if (!trimmed) {
    fail(field, `${field} is required`);
  }
  return trimmed;
}

function assertAlphabet(value: string, field: string, re: RegExp): void {
  if (!re.test(value)) {
    fail(field, `${field} contains characters outside the expected alphabet`);
  }
}

/** ISO `YYYY-MM-DD`, not in the future, and no more than {@link MAX_AGE_YEARS} old. */
export function isValidBirthDate(value: string): boolean {
  return sharedIsValidBirthDate(value);
}

function emptyDiscipline(): DisciplineBlock {
  return { enabled: false, division: null, powerFactor: null };
}

function parseGender(input: ProfileInput): Gender | null {
  if (input.gender === undefined || input.gender === null || input.gender === "") {
    return null;
  }
  if (input.gender !== "male" && input.gender !== "female") {
    fail("gender", "gender must be 'male' or 'female'");
  }
  return input.gender;
}

function parseBirthDate(input: ProfileInput): string | null {
  if (input.birthDate === undefined || input.birthDate === null || input.birthDate === "") {
    return null;
  }
  if (typeof input.birthDate !== "string" || !isValidBirthDate(input.birthDate)) {
    fail("birthDate", "birthDate must be a valid, non-future ISO date within a plausible age range");
  }
  return input.birthDate;
}

function parseUaNames(
  input: ProfileInput,
  options: { required: boolean },
): {
  firstNameUa: string | null;
  lastNameUa: string | null;
} {
  const firstNameUa = options.required
    ? requiredString(input.firstNameUa, "firstNameUa", NAME_MAX_LENGTH)
    : optionalString(input.firstNameUa, "firstNameUa", NAME_MAX_LENGTH);
  if (firstNameUa) {
    assertAlphabet(firstNameUa, "firstNameUa", UA_NAME_RE);
  }
  const lastNameUa = options.required
    ? requiredString(input.lastNameUa, "lastNameUa", NAME_MAX_LENGTH)
    : optionalString(input.lastNameUa, "lastNameUa", NAME_MAX_LENGTH);
  if (lastNameUa) {
    assertAlphabet(lastNameUa, "lastNameUa", UA_NAME_RE);
  }
  return { firstNameUa, lastNameUa };
}

function parseEnNames(
  input: ProfileInput,
  options: { required: boolean },
): {
  firstNameEn: string | null;
  lastNameEn: string | null;
} {
  const firstNameEn = options.required
    ? requiredString(input.firstNameEn, "firstNameEn", NAME_MAX_LENGTH)
    : optionalString(input.firstNameEn, "firstNameEn", NAME_MAX_LENGTH);
  if (firstNameEn) {
    assertAlphabet(firstNameEn, "firstNameEn", LATIN_NAME_RE);
  }
  const lastNameEn = options.required
    ? requiredString(input.lastNameEn, "lastNameEn", NAME_MAX_LENGTH)
    : optionalString(input.lastNameEn, "lastNameEn", NAME_MAX_LENGTH);
  if (lastNameEn) {
    assertAlphabet(lastNameEn, "lastNameEn", LATIN_NAME_RE);
  }
  return { firstNameEn, lastNameEn };
}

/** Nickname is always required when this field is part of the save payload. */
function parseNickname(input: ProfileInput): string {
  const nickname = requiredString(input.nickname, "nickname", NICKNAME_MAX_LENGTH);
  if (CONTROL_CHAR_RE.test(nickname) || !NICKNAME_RE.test(nickname)) {
    fail("nickname", "nickname contains invalid characters");
  }
  return nickname;
}

function parseIpscRegion(input: ProfileInput, ipscMember: boolean): string | null {
  let ipscRegion = optionalString(input.ipscRegion, "ipscRegion", IPSC_REGION_MAX_LENGTH);
  if (ipscRegion) {
    ipscRegion = ipscRegion.toUpperCase();
  } else if (ipscMember) {
    ipscRegion = "UA";
  }
  return ipscRegion;
}

function parseDisciplineBlock(
  discipline: DisciplineKey,
  raw: DisciplineBlockInput | undefined,
  flat?: { enabled?: unknown; division?: unknown; powerFactor?: unknown },
): DisciplineBlock {
  const source = raw ?? flat ?? {};
  const enabled = Boolean(source.enabled);
  if (!enabled) {
    return emptyDiscipline();
  }

  const division =
    source.division === undefined || source.division === null || source.division === ""
      ? null
      : typeof source.division === "string"
        ? source.division.trim()
        : fail("division", "division must be a string");

  if (!division || !isDivisionFor(discipline, division)) {
    fail("division", `division must be a valid ${discipline} division`);
  }

  let powerFactor: PowerFactor | null = null;
  if (source.powerFactor === undefined || source.powerFactor === null || source.powerFactor === "") {
    powerFactor = DISCIPLINE_DEFAULT_POWER_FACTOR[discipline];
  } else if (isPowerFactor(source.powerFactor)) {
    powerFactor = source.powerFactor;
  } else {
    fail("powerFactor", "powerFactor must be 'minor' or 'major'");
  }

  return { enabled: true, division, powerFactor };
}

function sectionDisciplineKey(section: ProfileSection): DisciplineKey | null {
  switch (section) {
    case "discipline_pistol":
      return "pistol";
    case "discipline_carbine":
      return "carbine";
    case "discipline_pcc":
      return "pcc_mini_rifle";
    case "discipline_shotgun":
      return "shotgun";
    default:
      return null;
  }
}

export function parseProfileSection(value: unknown): ProfileSection | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || !(PROFILE_SECTIONS as readonly string[]).includes(value)) {
    fail("section", "section must be a known profile section key");
  }
  return value as ProfileSection;
}

/**
 * Full-document normalize (legacy / no-section). Unspecified fields become
 * null/false — callers that need merge must use {@link normalizeProfileSection}.
 */
export function normalizeProfileInput(input: ProfileInput): NormalizedProfile {
  const nickname = parseNickname(input);
  const gender = parseGender(input);
  const birthDate = parseBirthDate(input);

  const upsfMember = Boolean(input.upsfMember);
  const { firstNameUa, lastNameUa } = upsfMember
    ? parseUaNames(input, { required: true })
    : { firstNameUa: null, lastNameUa: null };
  const region = upsfMember ? requiredString(input.region, "region", REGION_MAX_LENGTH) : null;
  const city = upsfMember ? optionalString(input.city, "city", CITY_MAX_LENGTH) : null;
  const club = upsfMember ? requiredString(input.club, "club", CLUB_MAX_LENGTH) : null;

  const ipscMember = Boolean(input.ipscMember);
  const { firstNameEn, lastNameEn } = ipscMember
    ? parseEnNames(input, { required: true })
    : { firstNameEn: null, lastNameEn: null };
  const ipscMemberNumber = ipscMember
    ? optionalString(input.ipscMemberNumber, "ipscMemberNumber", IPSC_MEMBER_NUMBER_MAX_LENGTH)
    : null;
  const ipscRegion = ipscMember ? parseIpscRegion(input, true) : null;

  return {
    firstNameUa,
    lastNameUa,
    firstNameEn,
    lastNameEn,
    nickname,
    gender,
    birthDate,
    upsfMember,
    region,
    city,
    club,
    ipscMember,
    ipscMemberNumber,
    ipscRegion,
    pistol: parseDisciplineBlock("pistol", input.pistol),
    carbine: parseDisciplineBlock("carbine", input.carbine),
    pccMiniRifle: parseDisciplineBlock("pcc_mini_rifle", input.pccMiniRifle),
    shotgun: parseDisciplineBlock("shotgun", input.shotgun),
  };
}

/** Partial patch for one section — only keys that belong to that block. */
export type ProfileSectionPatch = Partial<NormalizedProfile> & {
  section: ProfileSection;
};

/**
 * Validates a per-section payload. Returns only the fields that section owns
 * (membership off / discipline disabled clears nested fields).
 */
export function normalizeProfileSection(input: ProfileInput): ProfileSectionPatch {
  const section = parseProfileSection(input.section);
  if (!section) {
    fail("section", "section is required for sectional updates");
  }

  switch (section) {
    case "profile": {
      const gender = parseGender(input);
      const birthDate = parseBirthDate(input);
      const upsfMember = Boolean(input.upsfMember);
      const ipscMember = Boolean(input.ipscMember);
      const uaNames = upsfMember
        ? parseUaNames(input, { required: true })
        : { firstNameUa: null, lastNameUa: null };
      const enNames = ipscMember
        ? parseEnNames(input, { required: true })
        : { firstNameEn: null, lastNameEn: null };
      return {
        section,
        nickname: parseNickname(input),
        gender,
        birthDate,
        upsfMember,
        ...uaNames,
        region: upsfMember ? requiredString(input.region, "region", REGION_MAX_LENGTH) : null,
        city: upsfMember ? optionalString(input.city, "city", CITY_MAX_LENGTH) : null,
        club: upsfMember ? requiredString(input.club, "club", CLUB_MAX_LENGTH) : null,
        ipscMember,
        ...enNames,
        ipscMemberNumber: ipscMember
          ? optionalString(
              input.ipscMemberNumber,
              "ipscMemberNumber",
              IPSC_MEMBER_NUMBER_MAX_LENGTH,
            )
          : null,
        ipscRegion: ipscMember ? parseIpscRegion(input, true) : null,
      };
    }

    case "disciplines":
      return {
        section,
        pistol: parseDisciplineBlock("pistol", input.pistol),
        carbine: parseDisciplineBlock("carbine", input.carbine),
        pccMiniRifle: parseDisciplineBlock("pcc_mini_rifle", input.pccMiniRifle),
        shotgun: parseDisciplineBlock("shotgun", input.shotgun),
      };

    case "nickname":
      return { section, nickname: parseNickname(input) };

    case "birth_gender": {
      // Gender and birth date are independently optional.
      return {
        section,
        gender: parseGender(input),
        birthDate: parseBirthDate(input),
      };
    }

    case "upsf": {
      const upsfMember = Boolean(input.upsfMember);
      if (!upsfMember) {
        return {
          section,
          upsfMember: false,
          firstNameUa: null,
          lastNameUa: null,
          region: null,
          city: null,
          club: null,
        };
      }
      const { firstNameUa, lastNameUa } = parseUaNames(input, { required: true });
      return {
        section,
        upsfMember: true,
        firstNameUa,
        lastNameUa,
        region: requiredString(input.region, "region", REGION_MAX_LENGTH),
        city: optionalString(input.city, "city", CITY_MAX_LENGTH),
        club: requiredString(input.club, "club", CLUB_MAX_LENGTH),
      };
    }

    case "ipsc": {
      const ipscMember = Boolean(input.ipscMember);
      if (!ipscMember) {
        return {
          section,
          ipscMember: false,
          firstNameEn: null,
          lastNameEn: null,
          ipscMemberNumber: null,
          ipscRegion: null,
        };
      }
      const { firstNameEn, lastNameEn } = parseEnNames(input, { required: true });
      return {
        section,
        ipscMember: true,
        firstNameEn,
        lastNameEn,
        ipscMemberNumber: optionalString(
          input.ipscMemberNumber,
          "ipscMemberNumber",
          IPSC_MEMBER_NUMBER_MAX_LENGTH,
        ),
        ipscRegion: parseIpscRegion(input, true),
      };
    }

    case "discipline_pistol":
    case "discipline_carbine":
    case "discipline_pcc":
    case "discipline_shotgun": {
      const key = sectionDisciplineKey(section)!;
      const block = parseDisciplineBlock(key, undefined, {
        enabled: input.enabled,
        division: input.division,
        powerFactor: input.powerFactor,
      });
      if (key === "pistol") return { section, pistol: block };
      if (key === "carbine") return { section, carbine: block };
      if (key === "pcc_mini_rifle") return { section, pccMiniRifle: block };
      return { section, shotgun: block };
    }
  }
}

/** True when this save should stamp `profile_completed_at` (never clears it). */
export function shouldMarkProfileCompleted(
  section: ProfileSection | null,
  full: NormalizedProfile | null,
): boolean {
  if (section === "nickname") {
    return false;
  }
  if (section === "disciplines") {
    return false;
  }
  if (section !== null) {
    // Aggregate profile and legacy profile-bearing sections complete onboarding.
    return true;
  }
  // Full-document Save completes onboarding. Nickname is required on that path;
  // nickname bootstrap uses the sectional path above and does not stamp completion.
  return full !== null;
}

export type ProfileRow = {
  id: string;
  account_id: string;
  first_name_ua: string | null;
  last_name_ua: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  nickname: string | null;
  gender: Gender | null;
  birth_date: string | null;
  upsf_member: number;
  region: string | null;
  city: string | null;
  club: string | null;
  ipsc_member: number;
  ipsc_member_number: string | null;
  ipsc_region: string | null;
  pistol_enabled: number;
  pistol_division: string | null;
  pistol_power_factor: string | null;
  carbine_enabled: number;
  carbine_division: string | null;
  carbine_power_factor: string | null;
  pcc_mini_rifle_enabled: number;
  pcc_mini_rifle_division: string | null;
  pcc_mini_rifle_power_factor: string | null;
  shotgun_enabled: number;
  shotgun_division: string | null;
  shotgun_power_factor: string | null;
  profile_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function disciplineView(
  enabled: number,
  division: string | null,
  powerFactor: string | null,
): DisciplineBlock {
  return {
    enabled: enabled === 1,
    division,
    powerFactor: isPowerFactor(powerFactor) ? powerFactor : null,
  };
}

export type ProfileView = {
  firstNameUa: string | null;
  lastNameUa: string | null;
  firstNameEn: string | null;
  lastNameEn: string | null;
  nickname: string | null;
  gender: Gender | null;
  birthDate: string | null;
  upsfMember: boolean;
  region: string | null;
  city: string | null;
  club: string | null;
  ipscMember: boolean;
  ipscMemberNumber: string | null;
  ipscRegion: string | null;
  pistol: DisciplineBlock;
  carbine: DisciplineBlock;
  pccMiniRifle: DisciplineBlock;
  shotgun: DisciplineBlock;
  profileCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function profileView(row: ProfileRow): ProfileView {
  return {
    firstNameUa: row.first_name_ua,
    lastNameUa: row.last_name_ua,
    firstNameEn: row.first_name_en,
    lastNameEn: row.last_name_en,
    nickname: row.nickname,
    gender: row.gender,
    birthDate: row.birth_date,
    upsfMember: row.upsf_member === 1,
    region: row.region,
    city: row.city,
    club: row.club,
    ipscMember: row.ipsc_member === 1,
    ipscMemberNumber: row.ipsc_member_number,
    ipscRegion: row.ipsc_region,
    pistol: disciplineView(row.pistol_enabled, row.pistol_division, row.pistol_power_factor),
    carbine: disciplineView(row.carbine_enabled, row.carbine_division, row.carbine_power_factor),
    pccMiniRifle: disciplineView(
      row.pcc_mini_rifle_enabled,
      row.pcc_mini_rifle_division,
      row.pcc_mini_rifle_power_factor,
    ),
    shotgun: disciplineView(row.shotgun_enabled, row.shotgun_division, row.shotgun_power_factor),
    profileCompletedAt: row.profile_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Empty NormalizedProfile used when inserting a row from a section patch. */
export function emptyNormalizedProfile(): NormalizedProfile {
  return {
    firstNameUa: null,
    lastNameUa: null,
    firstNameEn: null,
    lastNameEn: null,
    nickname: null,
    gender: null,
    birthDate: null,
    upsfMember: false,
    region: null,
    city: null,
    club: null,
    ipscMember: false,
    ipscMemberNumber: null,
    ipscRegion: null,
    pistol: emptyDiscipline(),
    carbine: emptyDiscipline(),
    pccMiniRifle: emptyDiscipline(),
    shotgun: emptyDiscipline(),
  };
}

export function mergeProfilePatch(
  base: NormalizedProfile,
  patch: ProfileSectionPatch,
): NormalizedProfile {
  const { section: _section, ...fields } = patch;
  return { ...base, ...fields };
}

export function profileRowToNormalized(row: ProfileRow): NormalizedProfile {
  const view = profileView(row);
  return {
    firstNameUa: view.firstNameUa,
    lastNameUa: view.lastNameUa,
    firstNameEn: view.firstNameEn,
    lastNameEn: view.lastNameEn,
    nickname: view.nickname,
    gender: view.gender,
    birthDate: view.birthDate,
    upsfMember: view.upsfMember,
    region: view.region,
    city: view.city,
    club: view.club,
    ipscMember: view.ipscMember,
    ipscMemberNumber: view.ipscMemberNumber,
    ipscRegion: view.ipscRegion,
    pistol: view.pistol,
    carbine: view.carbine,
    pccMiniRifle: view.pccMiniRifle,
    shotgun: view.shotgun,
  };
}
