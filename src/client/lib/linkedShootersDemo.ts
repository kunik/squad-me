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
    phoneMasked: "+380••• •• 12",
  },
  {
    id: "ls-2",
    nickname: "Ranger",
    fullName: "Andriy Melnyk",
    phoneMasked: "+380••• •• 44",
  },
];

export const DEMO_REGISTER_ME: readonly LinkedShooter[] = [
  {
    id: "ls-3",
    nickname: "Coach",
    fullName: "Ігор Савченко",
    phoneMasked: "+380••• •• 90",
  },
];
