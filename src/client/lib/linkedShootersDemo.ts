import { maskPhoneE164 } from "./maskIdentity";

export type LinkedShooter = {
  id: string;
  nickname: string;
  fullName: string;
  phoneMasked: string;
};

/** Mock lists for Linked Shooters redesign (no backend yet). */
export const DEMO_I_REGISTER: readonly LinkedShooter[] = [
  {
    id: "ls-1",
    nickname: "Fox",
    fullName: "Олена Коваль",
    phoneMasked: maskPhoneE164("+380501112212"),
  },
  {
    id: "ls-2",
    nickname: "Ranger",
    fullName: "Andriy Melnyk",
    phoneMasked: maskPhoneE164("+380671234544"),
  },
];

export const DEMO_REGISTER_ME: readonly LinkedShooter[] = [
  {
    id: "ls-3",
    nickname: "Coach",
    fullName: "Ігор Савченко",
    phoneMasked: maskPhoneE164("+380931112290"),
  },
];
