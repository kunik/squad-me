import {
  CONTROL_CHAR_RE,
  LATIN_NAME_RE,
  MAX_AGE_YEARS,
  NICKNAME_RE,
  UA_NAME_RE,
  isValidBirthDate as sharedIsValidBirthDate,
  isValidNickname as sharedIsValidNickname,
} from "../../shared/profileValidation";
import type { DisciplineBlock, Gender } from "./authApi";

export { NICKNAME_RE, MAX_AGE_YEARS };

/** Client UI default when gender is unset (mirrors product default «чоловіча»). */
export const DEFAULT_GENDER: Gender = "male";

/** Pre-fill empty gender with male; never overwrite an existing value. */
export function initialGender(value: Gender | null | undefined | ""): Gender {
  if (value === "male" || value === "female") return value;
  return DEFAULT_GENDER;
}

/**
 * Resolve gender/birthDate for client validate+submit. Both are independently
 * optional. Explicit `male` / `female` always persist; empty gender only fills
 * {@link DEFAULT_GENDER} when a birth date is present.
 */
export function genderBirthForClientSave(
  gender: Gender | "",
  birthDate: string,
): { gender: Gender | ""; birthDate: string } {
  const birth = birthDate.trim();
  if (gender === "male" || gender === "female") {
    return { gender, birthDate: birth };
  }
  if (birth) return { gender: DEFAULT_GENDER, birthDate: birth };
  return { gender: "", birthDate: "" };
}

export function isValidNickname(value: string): boolean {
  return sharedIsValidNickname(value);
}

/** ISO `YYYY-MM-DD`, not in the future, and no more than {@link MAX_AGE_YEARS} old. */
export function isValidBirthDateClient(value: string): boolean {
  return sharedIsValidBirthDate(value);
}

export type ProfileFormFieldKey =
  | "nickname"
  | "gender"
  | "birthDate"
  | "firstNameUa"
  | "lastNameUa"
  | "region"
  | "city"
  | "club"
  | "firstNameEn"
  | "lastNameEn"
  | "ipscMemberNumber"
  | "ipscRegion"
  | "pistol"
  | "carbine"
  | "pccMiniRifle"
  | "shotgun";

export type ProfileClientErrorCode =
  | "invalid_profile"
  | "nickname_required"
  | "nickname_charset"
  | "name_ua"
  | "name_en"
  | "field_required"
  | "division_required";

export type ProfileFormValidationFailure = {
  fields: ProfileFormFieldKey[];
  code: ProfileClientErrorCode;
};

type ProfileSectionInput = {
  nickname: string;
  gender: Gender | "";
  birthDate: string;
  upsfMember: boolean;
  firstNameUa: string;
  lastNameUa: string;
  region: string;
  city: string;
  club: string;
  ipscMember: boolean;
  firstNameEn: string;
  lastNameEn: string;
  ipscMemberNumber: string;
  ipscRegion: string;
};

type DivisionsSectionInput = {
  pistol: DisciplineBlock;
  carbine: DisciplineBlock;
  pccMiniRifle: DisciplineBlock;
  shotgun: DisciplineBlock;
};

export type ProfileFieldIssue = {
  field: ProfileFormFieldKey;
  code: ProfileClientErrorCode;
  /** Required-but-empty — suppress until the field is touched or submit is attempted. */
  emptyRequired: boolean;
};

const CODE_PRIORITY: readonly ProfileClientErrorCode[] = [
  "nickname_required",
  "nickname_charset",
  "field_required",
  "name_ua",
  "name_en",
  "division_required",
  "invalid_profile",
];

export function primaryProfileErrorCode(
  issues: readonly Pick<ProfileFieldIssue, "code">[],
): ProfileClientErrorCode {
  for (const code of CODE_PRIORITY) {
    if (issues.some((issue) => issue.code === code)) return code;
  }
  return "invalid_profile";
}

/**
 * Full profile-section issue list (PROFILE-006). Used for submit and live
 * validation; empty-required issues can be filtered until touch/submit.
 */
export function listProfileSectionFieldIssues(
  input: ProfileSectionInput,
): ProfileFieldIssue[] {
  const issues: ProfileFieldIssue[] = [];

  const nickname = input.nickname.trim();
  if (!nickname) {
    issues.push({ field: "nickname", code: "nickname_required", emptyRequired: true });
  } else if (CONTROL_CHAR_RE.test(nickname) || !NICKNAME_RE.test(nickname)) {
    issues.push({ field: "nickname", code: "nickname_charset", emptyRequired: false });
  }

  if (input.gender && input.gender !== "male" && input.gender !== "female") {
    issues.push({ field: "gender", code: "invalid_profile", emptyRequired: false });
  }
  if (input.birthDate && !isValidBirthDateClient(input.birthDate)) {
    issues.push({ field: "birthDate", code: "invalid_profile", emptyRequired: false });
  }

  if (input.upsfMember) {
    const first = input.firstNameUa.trim();
    const last = input.lastNameUa.trim();
    const region = input.region.trim();
    const club = input.club.trim();

    if (!first) {
      issues.push({ field: "firstNameUa", code: "field_required", emptyRequired: true });
    } else if (!UA_NAME_RE.test(first)) {
      issues.push({ field: "firstNameUa", code: "name_ua", emptyRequired: false });
    }
    if (!last) {
      issues.push({ field: "lastNameUa", code: "field_required", emptyRequired: true });
    } else if (!UA_NAME_RE.test(last)) {
      issues.push({ field: "lastNameUa", code: "name_ua", emptyRequired: false });
    }
    if (!region) {
      issues.push({ field: "region", code: "field_required", emptyRequired: true });
    }
    if (!club) {
      issues.push({ field: "club", code: "field_required", emptyRequired: true });
    }
  }

  if (input.ipscMember) {
    const first = input.firstNameEn.trim();
    const last = input.lastNameEn.trim();
    const ipscRegion = input.ipscRegion.trim();

    if (!first) {
      issues.push({ field: "firstNameEn", code: "field_required", emptyRequired: true });
    } else if (!LATIN_NAME_RE.test(first)) {
      issues.push({ field: "firstNameEn", code: "name_en", emptyRequired: false });
    }
    if (!last) {
      issues.push({ field: "lastNameEn", code: "field_required", emptyRequired: true });
    } else if (!LATIN_NAME_RE.test(last)) {
      issues.push({ field: "lastNameEn", code: "name_en", emptyRequired: false });
    }
    if (!ipscRegion) {
      issues.push({ field: "ipscRegion", code: "field_required", emptyRequired: true });
    }
  }

  return issues;
}

/**
 * Client-side profile-section checks that mirror the worker rules users hit
 * most often. Returns the field keys to highlight (PROFILE-006).
 */
export function validateProfileSectionClient(
  input: ProfileSectionInput,
): ProfileFormValidationFailure | null {
  const issues = listProfileSectionFieldIssues(input);
  if (issues.length === 0) return null;
  return {
    fields: [...new Set(issues.map((issue) => issue.field))],
    code: primaryProfileErrorCode(issues),
  };
}

/** Enabled discipline without a division — highlight each offending select. */
export function validateDivisionsSectionClient(
  input: DivisionsSectionInput,
): ProfileFormValidationFailure | null {
  const fields: ProfileFormFieldKey[] = [];
  const entries = [
    ["pistol", input.pistol],
    ["carbine", input.carbine],
    ["pccMiniRifle", input.pccMiniRifle],
    ["shotgun", input.shotgun],
  ] as const;
  for (const [key, block] of entries) {
    if (block.enabled && !block.division) fields.push(key);
  }
  if (fields.length === 0) return null;
  return { fields: [...fields], code: "division_required" };
}

/** Maps a server `invalid_profile` `field` onto the form highlight keys. */
export function profileFieldFromServer(field: string | null | undefined): ProfileFormFieldKey | null {
  switch (field) {
    case "nickname":
    case "gender":
    case "birthDate":
    case "firstNameUa":
    case "lastNameUa":
    case "region":
    case "city":
    case "club":
    case "firstNameEn":
    case "lastNameEn":
    case "ipscMemberNumber":
    case "ipscRegion":
      return field;
    default:
      return null;
  }
}
