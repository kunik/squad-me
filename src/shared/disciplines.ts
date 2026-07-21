/**
 * Division + power-factor allow-lists shared by client and worker.
 * Source: Obsidian products/match-platform/specs/divisions-classes.md
 * (union of IPSC + UPSF options — no Match.federation filter on the profile).
 */

export const POWER_FACTORS = ["minor", "major"] as const;
export type PowerFactor = (typeof POWER_FACTORS)[number];

export const PISTOL_DIVISIONS = [
  "open",
  "production_optics",
  "production_optics_light",
  "production",
  "optics",
  "standard",
  "classic",
  "revolver",
] as const;

export const CARBINE_DIVISIONS = [
  "semi_auto_open",
  "semi_auto_standard",
  "manual_action_contemporary",
  "manual_action_bolt",
  "manual_action_open",
  "manual_action_standard",
  "manual_action_lever",
] as const;

export const PCC_MINI_RIFLE_DIVISIONS = [
  "mini_rifle_open",
  "mini_rifle_standard",
  "pcc_optics",
  "pcc_standard",
] as const;

export const SHOTGUN_DIVISIONS = [
  "open",
  "modified",
  "standard",
  "standard_manual",
] as const;

/** API / client camelCase keys. */
export type ApiDisciplineKey = "pistol" | "carbine" | "pccMiniRifle" | "shotgun";

/** Worker / DB snake_case keys. */
export type WorkerDisciplineKey = "pistol" | "carbine" | "pcc_mini_rifle" | "shotgun";

export const API_DISCIPLINE_DEFAULT_POWER_FACTOR: Record<ApiDisciplineKey, PowerFactor> = {
  pistol: "minor",
  carbine: "minor",
  pccMiniRifle: "minor",
  shotgun: "major",
};

/** Default division when a discipline is newly enabled in the profile form. */
export const API_DISCIPLINE_DEFAULT_DIVISION: Record<ApiDisciplineKey, string> = {
  pistol: "production",
  carbine: "semi_auto_open", // SAO
  pccMiniRifle: "pcc_optics",
  shotgun: "open",
};

export const API_DISCIPLINE_DIVISIONS: Record<ApiDisciplineKey, readonly string[]> = {
  pistol: PISTOL_DIVISIONS,
  carbine: CARBINE_DIVISIONS,
  pccMiniRifle: PCC_MINI_RIFLE_DIVISIONS,
  shotgun: SHOTGUN_DIVISIONS,
};

export const WORKER_DISCIPLINE_DEFAULT_POWER_FACTOR: Record<WorkerDisciplineKey, PowerFactor> = {
  pistol: "minor",
  carbine: "minor",
  pcc_mini_rifle: "minor",
  shotgun: "major",
};

export const WORKER_DISCIPLINE_DEFAULT_DIVISION: Record<WorkerDisciplineKey, string> = {
  pistol: "production",
  carbine: "semi_auto_open",
  pcc_mini_rifle: "pcc_optics",
  shotgun: "open",
};

export const WORKER_DISCIPLINE_DIVISIONS: Record<WorkerDisciplineKey, readonly string[]> = {
  pistol: PISTOL_DIVISIONS,
  carbine: CARBINE_DIVISIONS,
  pcc_mini_rifle: PCC_MINI_RIFLE_DIVISIONS,
  shotgun: SHOTGUN_DIVISIONS,
};

export function isPowerFactor(value: unknown): value is PowerFactor {
  return typeof value === "string" && (POWER_FACTORS as readonly string[]).includes(value);
}

export function isApiDivisionFor(discipline: ApiDisciplineKey, value: unknown): boolean {
  return (
    typeof value === "string" &&
    (API_DISCIPLINE_DIVISIONS[discipline] as readonly string[]).includes(value)
  );
}

export function isWorkerDivisionFor(discipline: WorkerDisciplineKey, value: unknown): boolean {
  return (
    typeof value === "string" &&
    (WORKER_DISCIPLINE_DIVISIONS[discipline] as readonly string[]).includes(value)
  );
}
