/**
 * Client-side division / power-factor allow-lists — re-exports the shared
 * canonical lists from `src/shared/disciplines.ts` under API camelCase keys.
 */

export {
  POWER_FACTORS,
  PISTOL_DIVISIONS,
  CARBINE_DIVISIONS,
  PCC_MINI_RIFLE_DIVISIONS,
  SHOTGUN_DIVISIONS,
  type PowerFactor,
} from "../../shared/disciplines";

import {
  API_DISCIPLINE_DEFAULT_DIVISION,
  API_DISCIPLINE_DEFAULT_POWER_FACTOR,
  API_DISCIPLINE_DIVISIONS,
  type ApiDisciplineKey,
} from "../../shared/disciplines";

export type DisciplineKey = ApiDisciplineKey;

export const DISCIPLINE_DEFAULT_POWER_FACTOR = API_DISCIPLINE_DEFAULT_POWER_FACTOR;
export const DISCIPLINE_DEFAULT_DIVISION = API_DISCIPLINE_DEFAULT_DIVISION;
export const DISCIPLINE_DIVISIONS = API_DISCIPLINE_DIVISIONS;
