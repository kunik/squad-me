/**
 * Division + power-factor allow-lists for Profile discipline blocks.
 * Canonical lists live in `src/shared/disciplines.ts`; this module keeps the
 * worker/DB snake_case `DisciplineKey` surface used by `profile.ts`.
 */

export {
  POWER_FACTORS,
  PISTOL_DIVISIONS,
  CARBINE_DIVISIONS,
  PCC_MINI_RIFLE_DIVISIONS,
  SHOTGUN_DIVISIONS,
  isPowerFactor,
  type PowerFactor,
} from "../../shared/disciplines";

import {
  PISTOL_DIVISIONS,
  CARBINE_DIVISIONS,
  PCC_MINI_RIFLE_DIVISIONS,
  SHOTGUN_DIVISIONS,
  WORKER_DISCIPLINE_DEFAULT_DIVISION,
  WORKER_DISCIPLINE_DEFAULT_POWER_FACTOR,
  WORKER_DISCIPLINE_DIVISIONS,
  isWorkerDivisionFor,
  type WorkerDisciplineKey,
} from "../../shared/disciplines";

export type PistolDivision = (typeof PISTOL_DIVISIONS)[number];
export type CarbineDivision = (typeof CARBINE_DIVISIONS)[number];
export type PccMiniRifleDivision = (typeof PCC_MINI_RIFLE_DIVISIONS)[number];
export type ShotgunDivision = (typeof SHOTGUN_DIVISIONS)[number];

export type DisciplineKey = WorkerDisciplineKey;

export const DISCIPLINE_DEFAULT_POWER_FACTOR = WORKER_DISCIPLINE_DEFAULT_POWER_FACTOR;
export const DISCIPLINE_DEFAULT_DIVISION = WORKER_DISCIPLINE_DEFAULT_DIVISION;
export const DISCIPLINE_DIVISIONS = WORKER_DISCIPLINE_DIVISIONS;

export function isDivisionFor(discipline: DisciplineKey, value: unknown): boolean {
  return isWorkerDivisionFor(discipline, value);
}
