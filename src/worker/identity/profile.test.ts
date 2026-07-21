import { describe, expect, it } from "vitest";
import {
  isValidBirthDate,
  mergeProfilePatch,
  normalizeProfileInput,
  normalizeProfileSection,
  ProfileValidationError,
  type ProfileInput,
} from "./profile";

function baseInput(overrides: Partial<ProfileInput> = {}): ProfileInput {
  return {
    nickname: "Fox007",
    upsfMember: true,
    firstNameUa: "Олена",
    lastNameUa: "Шевченко",
    region: "Київська",
    club: "Динамо",
    gender: "female",
    birthDate: "1990-05-15",
    ...overrides,
  };
}

describe("isValidBirthDate", () => {
  it("accepts a plausible past date", () => {
    expect(isValidBirthDate("1990-05-15")).toBe(true);
  });

  it("rejects a future date", () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    expect(isValidBirthDate(future.toISOString().slice(0, 10))).toBe(false);
  });

  it("rejects implausibly old dates (age > 120)", () => {
    expect(isValidBirthDate("1850-01-01")).toBe(false);
  });

  it("rejects malformed / rolled-over calendar dates", () => {
    expect(isValidBirthDate("2024-02-30")).toBe(false);
    expect(isValidBirthDate("not-a-date")).toBe(false);
    expect(isValidBirthDate("1990/05/15")).toBe(false);
  });
});

describe("normalizeProfileInput", () => {
  it("accepts a full payload with gender + birthDate", () => {
    const result = normalizeProfileInput(baseInput());
    expect(result).toMatchObject({
      firstNameUa: "Олена",
      lastNameUa: "Шевченко",
      gender: "female",
      birthDate: "1990-05-15",
      upsfMember: true,
      region: "Київська",
      club: "Динамо",
      ipscMember: false,
      ipscRegion: null,
    });
  });

  it("requires a nickname", () => {
    expect(() => normalizeProfileInput({ nickname: "" })).toThrow(ProfileValidationError);
    expect(() => normalizeProfileInput({})).toThrow(ProfileValidationError);
    try {
      normalizeProfileInput({});
      throw new Error("expected normalizeProfileInput to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ProfileValidationError);
      expect((err as ProfileValidationError).field).toBe("nickname");
    }
  });

  it("accepts a nickname-only payload — gender/birthDate stay null", () => {
    const result = normalizeProfileInput({ nickname: "Fox007" });
    expect(result.nickname).toBe("Fox007");
    expect(result.gender).toBeNull();
    expect(result.birthDate).toBeNull();
    expect(result.firstNameUa).toBeNull();
    expect(result.lastNameUa).toBeNull();
  });

  it("accepts gender without birthDate and birthDate without gender", () => {
    expect(normalizeProfileInput({ nickname: "Fox007", gender: "female" })).toMatchObject({
      gender: "female",
      birthDate: null,
    });
    expect(normalizeProfileInput({ nickname: "Fox007", birthDate: "1990-05-15" })).toMatchObject({
      gender: null,
      birthDate: "1990-05-15",
    });
  });

  it("requires a valid gender when provided", () => {
    expect(() => normalizeProfileInput(baseInput({ gender: "other" }))).toThrow(
      ProfileValidationError,
    );
  });

  it("requires a valid birthDate when provided", () => {
    expect(() => normalizeProfileInput(baseInput({ birthDate: "not-a-date" }))).toThrow(
      ProfileValidationError,
    );
  });

  it("rejects non-Ukrainian Cyrillic, Latin, and digits in UA name fields", () => {
    expect(() => normalizeProfileInput(baseInput({ firstNameUa: "Olena" }))).toThrow(
      ProfileValidationError,
    );
    expect(() => normalizeProfileInput(baseInput({ lastNameUa: "Шевченко123" }))).toThrow(
      ProfileValidationError,
    );
    expect(() => normalizeProfileInput(baseInput({ firstNameUa: "Олёна" }))).toThrow(
      ProfileValidationError,
    );
    expect(() => normalizeProfileInput(baseInput({ lastNameUa: "Смык" }))).toThrow(
      ProfileValidationError,
    );
  });

  it("rejects digits in EN name fields", () => {
    expect(() =>
      normalizeProfileInput(
        baseInput({
          upsfMember: false,
          ipscMember: true,
          firstNameEn: "Olena2",
          lastNameEn: "Shevchenko",
        }),
      ),
    ).toThrow(ProfileValidationError);
  });

  it("requires UPSF first/last name, region, and club when membership is on", () => {
    expect(() =>
      normalizeProfileInput(baseInput({ firstNameUa: "", lastNameUa: "Шевченко" })),
    ).toThrow(ProfileValidationError);
    expect(() => normalizeProfileInput(baseInput({ region: "" }))).toThrow(ProfileValidationError);
    expect(() => normalizeProfileInput(baseInput({ club: "" }))).toThrow(ProfileValidationError);
    expect(() =>
      normalizeProfileInput(
        baseInput({ upsfMember: true, firstNameUa: "Олена", lastNameUa: "Шевченко", city: "" }),
      ),
    ).not.toThrow();
  });

  it("requires IPSC first/last name when membership is on (member number optional)", () => {
    expect(() =>
      normalizeProfileInput(
        baseInput({
          upsfMember: false,
          ipscMember: true,
          firstNameEn: "",
          lastNameEn: "Shevchenko",
        }),
      ),
    ).toThrow(ProfileValidationError);
    const result = normalizeProfileInput(
      baseInput({
        upsfMember: false,
        ipscMember: true,
        firstNameEn: "Olena",
        lastNameEn: "Shevchenko",
      }),
    );
    expect(result.ipscMemberNumber).toBeNull();
    expect(result.ipscRegion).toBe("UA");
  });

  it("accepts hyphenated / space-separated Cyrillic names case-insensitively", () => {
    expect(() =>
      normalizeProfileInput(baseInput({ lastNameUa: "Ковальська-Шевченко" })),
    ).not.toThrow();
  });

  it("rejects non-Latin characters in the optional EN name fields", () => {
    expect(() =>
      normalizeProfileInput(
        baseInput({
          upsfMember: false,
          ipscMember: true,
          firstNameEn: "Олена",
          lastNameEn: "Shevchenko",
        }),
      ),
    ).toThrow(ProfileValidationError);
  });

  it("accepts valid Latin EN names", () => {
    const result = normalizeProfileInput(
      baseInput({
        upsfMember: false,
        ipscMember: true,
        firstNameEn: "Olena",
        lastNameEn: "Shevchenko",
      }),
    );
    expect(result.firstNameEn).toBe("Olena");
    expect(result.lastNameEn).toBe("Shevchenko");
  });

  it("leaves optional EN names as null when IPSC is off", () => {
    const result = normalizeProfileInput(baseInput());
    expect(result.firstNameEn).toBeNull();
    expect(result.lastNameEn).toBeNull();
  });

  it("rejects control characters and disallowed nickname punctuation", () => {
    expect(() =>
      normalizeProfileInput(baseInput({ nickname: "Fox\u0007" })),
    ).toThrow(ProfileValidationError);
    expect(() =>
      normalizeProfileInput(baseInput({ nickname: "Fox 007!" })),
    ).toThrow(ProfileValidationError);
  });

  it("accepts Latin/Cyrillic alphanumeric nicknames with spaces and hyphens", () => {
    expect(normalizeProfileInput(baseInput({ nickname: "Fox 007" })).nickname).toBe("Fox 007");
    expect(normalizeProfileInput(baseInput({ nickname: "Лисиця-7" })).nickname).toBe("Лисиця-7");
  });

  it("uppercases ipscRegion and caps it at 5 characters", () => {
    const result = normalizeProfileInput(
      baseInput({
        upsfMember: false,
        ipscMember: true,
        firstNameEn: "Olena",
        lastNameEn: "Shevchenko",
        ipscRegion: "ua",
      }),
    );
    expect(result.ipscRegion).toBe("UA");
  });

  it("rejects ipscRegion longer than 5 characters", () => {
    expect(() =>
      normalizeProfileInput(
        baseInput({
          upsfMember: false,
          ipscMember: true,
          firstNameEn: "Olena",
          lastNameEn: "Shevchenko",
          ipscRegion: "toolong",
        }),
      ),
    ).toThrow(ProfileValidationError);
  });

  it("defaults ipscRegion to 'UA' when ipscMember is checked and region is blank", () => {
    const result = normalizeProfileInput(
      baseInput({
        upsfMember: false,
        ipscMember: true,
        firstNameEn: "Olena",
        lastNameEn: "Shevchenko",
      }),
    );
    expect(result.ipscRegion).toBe("UA");
  });

  it("does not default ipscRegion when ipscMember is not checked", () => {
    const result = normalizeProfileInput(baseInput());
    expect(result.ipscRegion).toBeNull();
  });

  it("caps free-text field lengths defensively", () => {
    expect(() =>
      normalizeProfileInput(baseInput({ city: "а".repeat(101) })),
    ).toThrow(ProfileValidationError);
  });

  it("accepts an optional club free-text field value", () => {
    const result = normalizeProfileInput(baseInput({ club: "Дніпро Динамо" }));
    expect(result.club).toBe("Дніпро Динамо");
  });

  it("caps club length defensively", () => {
    expect(() =>
      normalizeProfileInput(baseInput({ club: "a".repeat(101) })),
    ).toThrow(ProfileValidationError);
  });

  it("defaults discipline blocks to disabled when omitted", () => {
    const result = normalizeProfileInput(baseInput());
    expect(result.pistol).toEqual({ enabled: false, division: null, powerFactor: null });
    expect(result.shotgun).toEqual({ enabled: false, division: null, powerFactor: null });
  });

  it("accepts an enabled pistol block with default minor power factor", () => {
    const result = normalizeProfileInput(
      baseInput({ pistol: { enabled: true, division: "open" } }),
    );
    expect(result.pistol).toEqual({
      enabled: true,
      division: "open",
      powerFactor: "minor",
    });
  });

  it("defaults shotgun power factor to major when enabled without one", () => {
    const result = normalizeProfileInput(
      baseInput({ shotgun: { enabled: true, division: "open" } }),
    );
    expect(result.shotgun.powerFactor).toBe("major");
  });

  it("rejects an invalid division for the discipline", () => {
    expect(() =>
      normalizeProfileInput(baseInput({ pistol: { enabled: true, division: "semi_auto_open" } })),
    ).toThrow(ProfileValidationError);
  });
});

describe("normalizeProfileSection", () => {
  it("nickname section only returns nickname", () => {
    const patch = normalizeProfileSection({ section: "nickname", nickname: "Fox007" });
    expect(patch).toEqual({ section: "nickname", nickname: "Fox007" });
  });

  it("nickname section rejects empty nickname", () => {
    expect(() => normalizeProfileSection({ section: "nickname", nickname: "" })).toThrow(
      ProfileValidationError,
    );
  });

  it("birth_gender allows gender or birthDate independently", () => {
    expect(
      normalizeProfileSection({ section: "birth_gender", gender: "female" }),
    ).toMatchObject({ gender: "female", birthDate: null });
    expect(
      normalizeProfileSection({ section: "birth_gender", birthDate: "1990-05-15" }),
    ).toMatchObject({ gender: null, birthDate: "1990-05-15" });
    expect(normalizeProfileSection({ section: "birth_gender" })).toMatchObject({
      gender: null,
      birthDate: null,
    });
  });

  it("upsf off clears nested fields", () => {
    const patch = normalizeProfileSection({
      section: "upsf",
      upsfMember: false,
      firstNameUa: "Олена",
      region: "Київ",
    });
    expect(patch).toMatchObject({
      upsfMember: false,
      firstNameUa: null,
      lastNameUa: null,
      region: null,
      city: null,
      club: null,
    });
  });

  it("upsf on requires names, region, and club", () => {
    expect(() =>
      normalizeProfileSection({
        section: "upsf",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
      }),
    ).toThrow(ProfileValidationError);
    const patch = normalizeProfileSection({
      section: "upsf",
      upsfMember: true,
      firstNameUa: "Олена",
      lastNameUa: "Шевченко",
      region: "Київська",
      club: "Динамо",
    });
    expect(patch).toMatchObject({
      upsfMember: true,
      firstNameUa: "Олена",
      lastNameUa: "Шевченко",
      region: "Київська",
      club: "Динамо",
    });
  });

  it("ipsc on requires EN names and defaults region", () => {
    const patch = normalizeProfileSection({
      section: "ipsc",
      ipscMember: true,
      firstNameEn: "Olena",
      lastNameEn: "Shevchenko",
    });
    expect(patch).toMatchObject({
      ipscMember: true,
      firstNameEn: "Olena",
      lastNameEn: "Shevchenko",
      ipscRegion: "UA",
    });
    expect(() =>
      normalizeProfileSection({
        section: "ipsc",
        ipscMember: true,
        firstNameEn: "Olena",
      }),
    ).toThrow(ProfileValidationError);
  });

  it("discipline_pistol disabled clears division/powerFactor", () => {
    const patch = normalizeProfileSection({
      section: "discipline_pistol",
      enabled: false,
      division: "open",
      powerFactor: "major",
    });
    expect(patch.pistol).toEqual({ enabled: false, division: null, powerFactor: null });
  });

  it("discipline_pcc maps to pccMiniRifle", () => {
    const patch = normalizeProfileSection({
      section: "discipline_pcc",
      enabled: true,
      division: "pcc_optics",
    });
    expect(patch.pccMiniRifle).toEqual({
      enabled: true,
      division: "pcc_optics",
      powerFactor: "minor",
    });
  });
});

describe("mergeProfilePatch", () => {
  it("merges a section without wiping untouched fields", () => {
    const base = normalizeProfileInput(
      baseInput({
        nickname: "Fox",
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        upsfMember: true,
        region: "Київська",
        club: "Динамо",
      }),
    );
    const merged = mergeProfilePatch(
      base,
      normalizeProfileSection({ section: "nickname", nickname: "Wolf" }),
    );
    expect(merged.nickname).toBe("Wolf");
    expect(merged.firstNameUa).toBe("Олена");
    expect(merged.region).toBe("Київська");
    expect(merged.gender).toBe("female");
  });
});
