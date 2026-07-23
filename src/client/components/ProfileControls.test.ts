import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../locale";
import { NotificationChannelsForm, NotificationChannelsSummary } from "./NotificationChannelsForm";
import { ProfileForm } from "./ProfileForm";
import { ProfileSummary } from "./ProfileSummary";
import type { DisciplineBlock } from "../lib/authApi";
import {
  genderBirthForClientSave,
  initialGender,
  listProfileSectionFieldIssues,
  profileFieldFromServer,
  validateDivisionsSectionClient,
  validateProfileSectionClient,
} from "../lib/profileFormValidation";

function withLocale(child: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(createElement(LocaleProvider, null, child));
}

function radioInputForValue(markup: string, value: string): string {
  const marker = `value="${value}"`;
  const valueIdx = markup.indexOf(marker);
  expect(valueIdx).toBeGreaterThan(-1);
  const inputIdx = markup.lastIndexOf("<input", valueIdx);
  expect(inputIdx).toBeGreaterThan(-1);
  const endIdx = markup.indexOf(">", valueIdx);
  expect(endIdx).toBeGreaterThan(valueIdx);
  return markup.slice(inputIdx, endIdx + 1);
}

describe("normal profile management controls", () => {
  it("uses the same Profile Edit/Save/Cancel controls without an onboarding footer", () => {
    const markup = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { nickname: "Falcon" },
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );

    expect(markup).toContain("Зберегти зміни");
    expect(markup).toContain("Скасувати");
    expect(markup).not.toContain("Пропустити");
  });

  it("renders notification channel radios with Save/Cancel and connect affordances", () => {
    const markup = withLocale(
      createElement(NotificationChannelsForm, {
        submitting: false,
        serverError: null,
        initialEmail: "shooter@example.test",
        phoneE164: "+380501112233",
        onSaveEmail: () => true,
        onCancel: () => undefined,
      }),
    );

    expect(markup).toContain("Електронна пошта");
    expect(markup).toContain("Telegram-бот");
    expect(markup).toContain("SMS");
    expect(markup).toContain("sho***@***.test");
    expect(markup).toContain("+380*****2233");
    expect(markup).not.toContain("shooter@example.test");
    expect(markup).not.toContain("+380501112233");
    expect(markup).toContain('type="radio"');
    expect(markup).toContain("Підключити");
    expect(markup).toContain("channel-status-icon");
    expect(markup).toContain("channel-status-icon--idle");
    expect(markup).toContain("channel-status-icon--hover");
    expect(markup).not.toContain("icon-channel-connected.png");
    expect(markup).not.toContain("icon-channel-disconnected.png");
    expect(markup).not.toContain("icon-verified.png");
    expect(markup).not.toContain("icon-cancel.png");
    expect(markup).toContain("Зберегти зміни");
    expect(markup).toContain("Скасувати");
    expect(markup).not.toContain("Надіслати код");
    expect(markup).not.toContain("Пропустити");

    // Gentelella list-group rows: radio / label / status / identifier.
    expect(markup).toContain("list-group-item");
    expect(markup).toContain("toggle-row");
    expect(markup).toContain('class="desc"');
    expect(markup).not.toMatch(
      /form-check[^>]*>[^<]*<(?:img|svg)[^>]*icon-channel-/,
    );

    // Disconnected Email/Telegram radios stay disabled; SMS (auth phone) is selectable.
    expect(radioInputForValue(markup, "email")).toContain("disabled");
    expect(radioInputForValue(markup, "telegram")).toContain("disabled");
    expect(radioInputForValue(markup, "sms")).not.toContain("disabled");
    expect(radioInputForValue(markup, "sms")).toContain("checked");
  });

  it("falls back summary preference to the first connected channel", () => {
    const markup = withLocale(
      createElement(NotificationChannelsSummary, {
        email: "shooter@example.test",
        phoneE164: "+380501112233",
        preferredChannel: "email",
      }),
    );

    // Email is never fake-connected; SMS row gets `.list-group-item active`.
    const emailMarker = markup.indexOf("Електронна пошта");
    const telegramMarker = markup.indexOf("Telegram-бот");
    const smsMarker = markup.indexOf("SMS");
    const emailRow = markup.slice(emailMarker - 120, telegramMarker);
    const smsRow = markup.slice(smsMarker - 120, smsMarker + 120);
    expect(emailRow).not.toContain("list-group-item active");
    expect(smsRow).toContain("list-group-item active");
  });

  it("renders notification channels summary with three channel rows", () => {
    const markup = withLocale(
      createElement(NotificationChannelsSummary, {
        email: "shooter@example.test",
        phoneE164: "+380501112233",
      }),
    );

    expect(markup).toContain("Електронна пошта");
    expect(markup).toContain("Telegram-бот");
    expect(markup).toContain("SMS");
    expect(markup).toContain("sho***@***.test");
    expect(markup).toContain("+380*****2233");
    expect(markup).not.toContain("shooter@example.test");
    expect(markup).not.toContain("+380501112233");
    expect(markup).toContain("channel-status-icon");
    expect(markup).toContain("status-green");
    expect(markup).not.toContain("icon-channel-connected.png");
    expect(markup).not.toContain("icon-channel-disconnected.png");
    expect(markup).not.toContain("icon-verified.png");
    expect(markup).not.toContain("profile-form__chevron");
    expect(markup).not.toContain("Зберегти зміни");
    expect(markup).not.toContain("Надіслати код");

    // Same Gentelella list-group skeleton as edit; status lives after the label row.
    expect(markup).toContain("list-group-item");
    expect(markup).toContain("toggle-row");
    expect(markup).not.toMatch(
      /class="label"[^>]*>[^<]*<img[^>]*icon-channel-/,
    );
    const smsIdx = markup.indexOf("SMS");
    const smsTail = markup.slice(smsIdx, smsIdx + 400);
    expect(smsTail).toContain("status-green");
    expect(smsTail).toContain("channel-status-icon");
  });
});

describe("collapsible membership / discipline toggles", () => {
  const emptyDiscipline: DisciplineBlock = {
    enabled: false,
    division: null,
    powerFactor: null,
  };

  it("shows Gentelella toggle switches in edit mode", () => {
    const profileMarkup = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { upsfMember: true },
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );
    const divisionsMarkup = withLocale(
      createElement(ProfileForm, {
        mode: "divisions",
        initialValues: {
          carbine: { enabled: true, division: "carbine_open", powerFactor: "minor" },
        },
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );

    expect(profileMarkup).toContain("toggle-row");
    expect(profileMarkup).toContain('role="switch"');
    expect(profileMarkup).toContain("toggle on");
    expect(profileMarkup).not.toContain("profile-form__chevron");
    expect(divisionsMarkup).toContain("toggle-row");
    expect(divisionsMarkup).toContain("toggle on");
    expect(divisionsMarkup).not.toContain("profile-form__chevron");
  });

  it("shows Yes/No text in view mode but still shows enabled nested content", () => {
    const profileMarkup = withLocale(
      createElement(ProfileSummary, {
        mode: "profile",
        profile: {
          upsfMember: true,
          firstNameUa: "Олена",
          lastNameUa: "Шевченко",
          region: "Київська",
          city: "Київ",
          club: "Club",
          ipscMember: false,
        },
      }),
    );
    const divisionsMarkup = withLocale(
      createElement(ProfileSummary, {
        mode: "divisions",
        profile: {
          pistol: emptyDiscipline,
          carbine: { enabled: true, division: "carbine_open", powerFactor: "minor" },
          pccMiniRifle: emptyDiscipline,
          shotgun: emptyDiscipline,
        },
      }),
    );

    expect(profileMarkup).toContain("profile-form__toggle-state");
    expect(profileMarkup).toContain("Так");
    expect(profileMarkup).toContain("Ні");
    expect(profileMarkup).not.toContain('role="switch"');
    expect(profileMarkup).not.toContain("profile-form__chevron");
    expect(profileMarkup).toContain("Олена");
    expect(profileMarkup).toContain("Шевченко");
    expect(divisionsMarkup).toContain("profile-form__toggle-state");
    expect(divisionsMarkup).toContain("Так");
    expect(divisionsMarkup).not.toContain('role="switch"');
    expect(divisionsMarkup).not.toContain("profile-form__chevron");
    expect(divisionsMarkup).toContain("profile-form__toggle-body");
    expect(divisionsMarkup).toContain("is-enabled");
    expect(divisionsMarkup).toContain("profile-form__discipline-meta");
    expect(divisionsMarkup).toContain(" - ");
  });
});

describe("IPSC region default", () => {
  it("pre-fills region with UA when IPSC membership is on and region is empty", () => {
    const markup = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { ipscMember: true },
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );

    expect(markup).toContain("Членський номер");
    expect(markup).toMatch(/placeholder="UA"[^>]*value="UA"|value="UA"[^>]*placeholder="UA"/);
  });

  it("keeps an existing non-empty IPSC region", () => {
    const markup = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { ipscMember: true, ipscRegion: "PL" },
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );

    expect(markup).toContain('value="PL"');
    expect(markup).not.toMatch(/value="UA"/);
  });
});

describe("gender default", () => {
  function radioInputBeforeLabel(markup: string, label: string): string {
    const labelIdx = markup.indexOf(label);
    expect(labelIdx).toBeGreaterThan(-1);
    const inputIdx = markup.lastIndexOf("<input", labelIdx);
    expect(inputIdx).toBeGreaterThan(-1);
    return markup.slice(inputIdx, labelIdx);
  }

  it("pre-selects male when gender is empty", () => {
    expect(initialGender(null)).toBe("male");
    expect(initialGender(undefined)).toBe("male");
    expect(initialGender("")).toBe("male");

    const markup = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { nickname: "Falcon" },
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );

    expect(radioInputBeforeLabel(markup, "Чоловіча")).toContain("checked");
    expect(radioInputBeforeLabel(markup, "Жіноча")).not.toContain("checked");
  });

  it("keeps an existing female gender", () => {
    expect(initialGender("female")).toBe("female");

    const markup = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { gender: "female", birthDate: "1990-05-15" },
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );

    expect(radioInputBeforeLabel(markup, "Жіноча")).toContain("checked");
    expect(radioInputBeforeLabel(markup, "Чоловіча")).not.toContain("checked");
  });

  it("PROFILE-008 persists male and female independently of birth date", () => {
    expect(genderBirthForClientSave("male", "")).toEqual({ gender: "male", birthDate: "" });
    expect(genderBirthForClientSave("female", "")).toEqual({ gender: "female", birthDate: "" });
    expect(genderBirthForClientSave("male", "1990-05-15")).toEqual({
      gender: "male",
      birthDate: "1990-05-15",
    });
    expect(genderBirthForClientSave("", "1990-05-15")).toEqual({
      gender: "male",
      birthDate: "1990-05-15",
    });
    expect(genderBirthForClientSave("", "")).toEqual({ gender: "", birthDate: "" });
  });
});

describe("membership copy, placeholders, and info blocks", () => {
  it("renders UPSF membership label, info, placeholders, and field hints", () => {
    const markup = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { upsfMember: true },
        showMembershipHints: true,
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );

    expect(markup).toContain("членство ФПСУ");
    expect(markup).toContain(
      "вводьте ім&#x27;я та прізвище українською мовою, як в офіційних документах",
    );
    expect(markup).not.toContain("Ім&#x27;я та прізвище (українською)");
    // Full-width info sits above the name+surname row (not inside Ім'я only).
    expect(markup).toMatch(
      /form-note" role="note">вводьте ім&#x27;я та прізвище українською мовою, як в офіційних документах<\/p><div class="form-row"/,
    );
    expect(markup).toContain('placeholder="Іван"');
    expect(markup).toContain('placeholder="Франко"');
    expect(markup).toContain('placeholder="Калуш"');
    expect(markup).toContain('placeholder="ССК Барвінок"');
    expect(markup).toContain("Для офіційних змагань ФПСУ.");
    expect(markup).toContain("Обов’язкове. Лише українські літери, пробіл або дефіс.");
    expect(markup).toContain("hint-rules");
    expect(markup).toContain("Для всеукраїнських змагань та чемпіонатів областей.");
    expect(markup).toContain("Для реєстрації на чемпіонати міст.");
    expect(markup).toContain("Для офіційних матчів ФПСУ.");
  });

  it("renders IPSC membership label, info, placeholders, and field hints", () => {
    const markup = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { ipscMember: true },
        showMembershipHints: true,
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );

    expect(markup).toContain("членство IPSC (МКПС)");
    expect(markup).toContain(
      "вводьте ім&#x27;я та прізвище англійською мовою, як в закордонних документах",
    );
    expect(markup).not.toContain("Ім&#x27;я та прізвище (англійською)");
    expect(markup).toMatch(
      /form-note" role="note">вводьте ім&#x27;я та прізвище англійською мовою, як в закордонних документах<\/p><div class="form-row"/,
    );
    expect(markup).toContain("Членський номер");
    expect(markup).toContain('placeholder="John"');
    expect(markup).toContain('placeholder="Smith"');
    expect(markup).toContain('placeholder="UA-12345"');
    expect(markup).toContain("Для офіційних змагань IPSC III категорії.");
    expect(markup).toContain("Обов’язкове. Лише латинські літери, пробіл або дефіс.");
    expect(markup).toContain("За замовчуванням UA.");
    expect(markup).toContain("Номер з сертифіката про вступ в федерацію IPSC.");
  });

  it("hides UPSF/IPSC intro notes and name FieldHints outside onboarding", () => {
    const upsf = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { upsfMember: true },
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );
    const ipsc = withLocale(
      createElement(ProfileForm, {
        mode: "profile",
        initialValues: { ipscMember: true },
        onSubmit: () => undefined,
        onCancel: () => undefined,
      }),
    );

    expect(upsf).not.toContain("form-note");
    expect(upsf).not.toContain(
      "вводьте ім&#x27;я та прізвище українською мовою, як в офіційних документах",
    );
    expect(upsf).not.toContain("Для офіційних змагань ФПСУ.");
    expect(upsf).toContain("Для всеукраїнських змагань та чемпіонатів областей.");
    expect(upsf).toContain("Для офіційних матчів ФПСУ.");

    expect(ipsc).not.toContain("form-note");
    expect(ipsc).not.toContain(
      "вводьте ім&#x27;я та прізвище англійською мовою, як в закордонних документах",
    );
    expect(ipsc).not.toContain("Для офіційних змагань IPSC III категорії.");
    expect(ipsc).toContain("За замовчуванням UA.");
    expect(ipsc).toContain("Номер з сертифіката про вступ в федерацію IPSC.");
  });
});

describe("discipline division defaults", () => {
  it("defines the product defaults for newly enabled disciplines", async () => {
    const { DISCIPLINE_DEFAULT_DIVISION } = await import("../lib/disciplines");
    expect(DISCIPLINE_DEFAULT_DIVISION).toEqual({
      pistol: "production",
      carbine: "semi_auto_open",
      pccMiniRifle: "pcc_optics",
      shotgun: "open",
    });
  });
});

describe("PROFILE-006 profile client validation highlights the offending field", () => {
  const emptyMembership = {
    upsfMember: false,
    firstNameUa: "",
    lastNameUa: "",
    region: "",
    city: "",
    club: "",
    ipscMember: false,
    firstNameEn: "",
    lastNameEn: "",
    ipscMemberNumber: "",
    ipscRegion: "",
  } as const;

  it("requires a nickname and rejects disallowed characters", () => {
    expect(
      validateProfileSectionClient({
        nickname: "",
        gender: "",
        birthDate: "",
        ...emptyMembership,
      }),
    ).toEqual({ fields: ["nickname"], code: "nickname_required" });

    expect(
      validateProfileSectionClient({
        nickname: "Fox!",
        gender: "",
        birthDate: "",
        ...emptyMembership,
      }),
    ).toEqual({ fields: ["nickname"], code: "nickname_charset" });
  });

  it("allows gender and birthDate independently", () => {
    expect(
      validateProfileSectionClient({
        nickname: "Fox",
        gender: "female",
        birthDate: "",
        ...emptyMembership,
      }),
    ).toBeNull();

    expect(
      validateProfileSectionClient({
        nickname: "Fox",
        gender: "",
        birthDate: "2000-01-15",
        ...emptyMembership,
      }),
    ).toBeNull();
  });

  it("flags missing UPSF/IPSC required fields and charset errors", () => {
    expect(
      validateProfileSectionClient({
        nickname: "Fox",
        gender: "",
        birthDate: "",
        upsfMember: true,
        firstNameUa: "",
        lastNameUa: "",
        region: "",
        city: "",
        club: "",
        ipscMember: false,
        firstNameEn: "",
        lastNameEn: "",
        ipscMemberNumber: "",
        ipscRegion: "",
      }),
    ).toEqual({
      fields: ["firstNameUa", "lastNameUa", "region", "club"],
      code: "field_required",
    });

    expect(
      validateProfileSectionClient({
        nickname: "Fox",
        gender: "",
        birthDate: "",
        upsfMember: true,
        firstNameUa: "Смык",
        lastNameUa: "Шевченко",
        region: "Київська",
        city: "",
        club: "Динамо",
        ipscMember: false,
        firstNameEn: "",
        lastNameEn: "",
        ipscMemberNumber: "",
        ipscRegion: "",
      }),
    ).toEqual({ fields: ["firstNameUa"], code: "name_ua" });

    expect(
      validateProfileSectionClient({
        nickname: "Fox",
        gender: "",
        birthDate: "",
        upsfMember: false,
        firstNameUa: "",
        lastNameUa: "",
        region: "",
        city: "",
        club: "",
        ipscMember: true,
        firstNameEn: "John",
        lastNameEn: "Шевченко",
        ipscMemberNumber: "",
        ipscRegion: "UA",
      }),
    ).toEqual({ fields: ["lastNameEn"], code: "name_en" });
  });

  it("marks empty-required vs charset issues for live validation filtering", () => {
    const issues = listProfileSectionFieldIssues({
      nickname: "Fox!",
      gender: "",
      birthDate: "",
      upsfMember: true,
      firstNameUa: "",
      lastNameUa: "Шевченко",
      region: "",
      city: "",
      club: "Динамо",
      ipscMember: false,
      firstNameEn: "",
      lastNameEn: "",
      ipscMemberNumber: "",
      ipscRegion: "",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "nickname",
          code: "nickname_charset",
          emptyRequired: false,
        }),
        expect.objectContaining({
          field: "firstNameUa",
          code: "field_required",
          emptyRequired: true,
        }),
        expect.objectContaining({
          field: "region",
          code: "field_required",
          emptyRequired: true,
        }),
      ]),
    );
    expect(issues.find((issue) => issue.field === "lastNameUa")).toBeUndefined();
    expect(issues.find((issue) => issue.field === "club")).toBeUndefined();
  });

  it("flags enabled disciplines without a division", () => {
    const empty: DisciplineBlock = { enabled: false, division: null, powerFactor: null };
    expect(
      validateDivisionsSectionClient({
        pistol: { enabled: true, division: null, powerFactor: "minor" },
        carbine: empty,
        pccMiniRifle: empty,
        shotgun: { enabled: true, division: null, powerFactor: "major" },
      }),
    ).toEqual({
      fields: ["pistol", "shotgun"],
      code: "division_required",
    });
  });

  it("maps server invalid_profile field names onto highlight keys", () => {
    expect(profileFieldFromServer("birthDate")).toBe("birthDate");
    expect(profileFieldFromServer("region")).toBe("region");
    expect(profileFieldFromServer("club")).toBe("club");
    expect(profileFieldFromServer("division")).toBeNull();
  });
});
