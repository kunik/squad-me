import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "../locale";
import type { Gender, ProfileInput, ProfileView } from "../lib/authApi";
import { translateAuthError } from "../lib/authErrors";
import { todayIsoDate } from "../lib/dateField";
import {
  genderBirthForClientSave,
  initialGender,
  listProfileSectionFieldIssues,
  primaryProfileErrorCode,
  profileFieldFromServer,
  validateProfileSectionClient,
  type ProfileClientErrorCode,
  type ProfileFormFieldKey,
} from "../lib/profileFormValidation";
import { UPSF_REGIONS } from "../lib/regions";
import { transliterateUa } from "../lib/transliterateUa";
import { CollapsibleToggleBlock } from "./CollapsibleToggleBlock";
import { DateField } from "./DateField";
import { FieldLabel } from "./FieldHint";
import { ProfileFormActions } from "./ProfileFormActions";

export type ProfileDetailsFormProps = {
  initialValues?: Partial<ProfileView>;
  submitting?: boolean;
  /** Already-translated error string from a failed server call. */
  serverError?: string | null;
  /** Server `invalid_profile` field name, when present. */
  serverField?: string | null;
  /**
   * UPSF/IPSC intro notes + name FieldHints. Shown only during profile
   * onboarding; omitted on normal `/profile` edit.
   */
  showMembershipHints?: boolean;
  submitLabel?: string;
  onSubmit: (values: ProfileInput) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
  cancelLabel?: string;
};

/** Matches server `parseIpscRegion` default when IPSC membership is on. */
const DEFAULT_IPSC_REGION = "UA";

function initialIpscRegion(
  value: string | null | undefined,
  ipscMember: boolean,
): string {
  if (value) return value;
  return ipscMember ? DEFAULT_IPSC_REGION : "";
}

/** Prefer saved EN; otherwise passport-style transliteration of UA when present. */
function initialEnFromUa(
  en: string | null | undefined,
  ua: string | null | undefined,
): string {
  if (en?.trim()) return en;
  const trimmedUa = ua?.trim() ?? "";
  return trimmedUa ? transliterateUa(trimmedUa) : (en ?? "");
}

function fillEmptyEnFromUa(en: string, ua: string): string {
  if (en.trim()) return en;
  const trimmedUa = ua.trim();
  return trimmedUa ? transliterateUa(trimmedUa) : en;
}

/**
 * Profile section editor: nickname, birth/gender, UPSF and IPSC membership.
 */
export function ProfileDetailsForm({
  initialValues,
  submitting,
  serverError,
  serverField,
  showMembershipHints = false,
  submitLabel,
  onSubmit,
  onDirtyChange,
  onCancel,
  cancelLabel,
}: ProfileDetailsFormProps) {
  const { t } = useLocale();
  const formRef = useRef<HTMLFormElement>(null);

  const [nickname, setNickname] = useState(initialValues?.nickname ?? "");
  const [gender, setGender] = useState<Gender | "">(initialGender(initialValues?.gender));
  const [birthDate, setBirthDate] = useState(initialValues?.birthDate ?? "");

  const [upsfMember, setUpsfMember] = useState(Boolean(initialValues?.upsfMember));
  const [firstNameUa, setFirstNameUa] = useState(initialValues?.firstNameUa ?? "");
  const [lastNameUa, setLastNameUa] = useState(initialValues?.lastNameUa ?? "");
  const [region, setRegion] = useState(initialValues?.region ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [club, setClub] = useState(initialValues?.club ?? "");

  const [ipscMember, setIpscMember] = useState(Boolean(initialValues?.ipscMember));
  const [firstNameEn, setFirstNameEn] = useState(() =>
    initialEnFromUa(initialValues?.firstNameEn, initialValues?.firstNameUa),
  );
  const [lastNameEn, setLastNameEn] = useState(() =>
    initialEnFromUa(initialValues?.lastNameEn, initialValues?.lastNameUa),
  );
  const [ipscMemberNumber, setIpscMemberNumber] = useState(
    initialValues?.ipscMemberNumber ?? "",
  );
  const [ipscRegion, setIpscRegion] = useState(
    initialIpscRegion(initialValues?.ipscRegion, Boolean(initialValues?.ipscMember)),
  );

  const [clientError, setClientError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<readonly ProfileFormFieldKey[]>([]);
  const touchedFieldsRef = useRef(new Set<ProfileFormFieldKey>());
  const submitAttemptedRef = useRef(false);

  useEffect(() => {
    const mapped = profileFieldFromServer(serverField);
    if (mapped) setInvalidFields([mapped]);
  }, [serverField]);

  function markDirty() {
    onDirtyChange?.(true);
  }

  function messageForCode(code: ProfileClientErrorCode): string {
    switch (code) {
      case "nickname_required":
        return t.profileErrorNicknameRequired;
      case "nickname_charset":
        return t.profileErrorNicknameCharset;
      case "field_required":
        return t.profileErrorFieldRequired;
      case "name_ua":
        return t.profileErrorNameUa;
      case "name_en":
        return t.profileErrorNameEn;
      default:
        return translateAuthError("invalid_profile", t);
    }
  }

  function focusFirstInvalid() {
    requestAnimationFrame(() => {
      const first = formRef.current?.querySelector<HTMLElement>(
        "input[aria-invalid='true'], select[aria-invalid='true'], button[aria-invalid='true']",
      );
      first?.focus?.();
    });
  }

  function applyVisibleIssues(
    issues: ReturnType<typeof listProfileSectionFieldIssues>,
    options?: { focus?: boolean },
  ) {
    const fields = [...new Set(issues.map((issue) => issue.field))];
    setInvalidFields(fields);
    setClientError(fields.length === 0 ? null : messageForCode(primaryProfileErrorCode(issues)));
    if (options?.focus && fields.length > 0) focusFirstInvalid();
  }

  type ProfileSnapshotOverrides = {
    nickname?: string;
    gender?: Gender | "";
    birthDate?: string;
    upsfMember?: boolean;
    firstNameUa?: string;
    lastNameUa?: string;
    region?: string;
    city?: string;
    club?: string;
    ipscMember?: boolean;
    firstNameEn?: string;
    lastNameEn?: string;
    ipscMemberNumber?: string;
    ipscRegion?: string;
  };

  function profileSnapshot(overrides: ProfileSnapshotOverrides = {}) {
    const { gender: genderToSave, birthDate: birthDateToSave } = genderBirthForClientSave(
      overrides.gender ?? gender,
      overrides.birthDate ?? birthDate,
    );
    return {
      nickname: overrides.nickname ?? nickname,
      gender: genderToSave,
      birthDate: birthDateToSave,
      upsfMember: overrides.upsfMember ?? upsfMember,
      firstNameUa: overrides.firstNameUa ?? firstNameUa,
      lastNameUa: overrides.lastNameUa ?? lastNameUa,
      region: overrides.region ?? region,
      city: overrides.city ?? city,
      club: overrides.club ?? club,
      ipscMember: overrides.ipscMember ?? ipscMember,
      firstNameEn: overrides.firstNameEn ?? firstNameEn,
      lastNameEn: overrides.lastNameEn ?? lastNameEn,
      ipscMemberNumber: overrides.ipscMemberNumber ?? ipscMemberNumber,
      ipscRegion: overrides.ipscRegion ?? ipscRegion,
    };
  }

  function liveValidateProfile(
    overrides: ProfileSnapshotOverrides = {},
    touch: readonly ProfileFormFieldKey[] = [],
  ) {
    for (const key of touch) touchedFieldsRef.current.add(key);
    const issues = listProfileSectionFieldIssues(profileSnapshot(overrides)).filter(
      (issue) =>
        !issue.emptyRequired ||
        submitAttemptedRef.current ||
        touchedFieldsRef.current.has(issue.field),
    );
    applyVisibleIssues(issues);
  }

  function showValidationFailure(failure: {
    fields: readonly ProfileFormFieldKey[];
    code: ProfileClientErrorCode;
  }) {
    setInvalidFields(failure.fields);
    setClientError(messageForCode(failure.code));
    focusFirstInvalid();
  }

  function fieldInvalid(key: ProfileFormFieldKey): boolean {
    return invalidFields.includes(key);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitAttemptedRef.current = true;

    const { gender: genderToSave, birthDate: birthDateToSave } = genderBirthForClientSave(
      gender,
      birthDate,
    );
    const resolvedFirstEn = fillEmptyEnFromUa(firstNameEn, firstNameUa);
    const resolvedLastEn = fillEmptyEnFromUa(lastNameEn, lastNameUa);
    if (resolvedFirstEn !== firstNameEn) setFirstNameEn(resolvedFirstEn);
    if (resolvedLastEn !== lastNameEn) setLastNameEn(resolvedLastEn);

    const snapshot = profileSnapshot({
      firstNameEn: resolvedFirstEn,
      lastNameEn: resolvedLastEn,
      gender: genderToSave,
      birthDate: birthDateToSave,
    });
    const failure = validateProfileSectionClient(snapshot);
    if (failure) {
      for (const field of failure.fields) touchedFieldsRef.current.add(field);
      showValidationFailure(failure);
      return;
    }

    setInvalidFields([]);
    setClientError(null);

    const trimmedNickname = nickname.trim();
    const trimmedFirstUa = firstNameUa.trim();
    const trimmedLastUa = lastNameUa.trim();
    const trimmedFirstEn = resolvedFirstEn.trim();
    const trimmedLastEn = resolvedLastEn.trim();

    onSubmit({
      section: "profile",
      nickname: trimmedNickname,
      gender: genderToSave || null,
      birthDate: birthDateToSave || null,
      upsfMember,
      firstNameUa: upsfMember ? trimmedFirstUa || null : null,
      lastNameUa: upsfMember ? trimmedLastUa || null : null,
      region: upsfMember ? region || null : null,
      city: upsfMember ? city.trim() || null : null,
      club: upsfMember ? club.trim() || null : null,
      ipscMember,
      firstNameEn: ipscMember ? trimmedFirstEn || null : null,
      lastNameEn: ipscMember ? trimmedLastEn || null : null,
      ipscMemberNumber: ipscMember ? ipscMemberNumber.trim() || null : null,
      ipscRegion: ipscMember ? ipscRegion.trim() || DEFAULT_IPSC_REGION : null,
    });
  }

  const displayedError = clientError ?? serverError ?? null;
  const busy = Boolean(submitting);

  return (
    <form
      ref={formRef}
      className="profile-form"
      onSubmit={handleSubmit}
      onChange={markDirty}
    >
      <fieldset className="profile-form__block">
        <div className="form-group">
          <FieldLabel hint={t.profileNicknameHint}>{t.profileNicknameLabel}</FieldLabel>
          <input
            className={`form-control${fieldInvalid("nickname") ? " is-invalid" : ""}`}
            type="text"
            autoComplete="off"
            maxLength={100}
            value={nickname}
            aria-invalid={fieldInvalid("nickname") || undefined}
            onChange={(e) => {
              const value = e.target.value;
              setNickname(value);
              liveValidateProfile({ nickname: value }, ["nickname"]);
            }}
          />
        </div>
      </fieldset>

      <fieldset className="profile-form__block">
        <div className="form-row">
          <DateField
            id="profile-birth-date"
            label={t.profileBirthDateLabel}
            hint={t.profileBirthDateHint}
            value={birthDate}
            invalid={fieldInvalid("birthDate")}
            onChange={(next) => {
              setBirthDate(next);
              liveValidateProfile({ birthDate: next }, ["birthDate"]);
            }}
            max={todayIsoDate()}
          />
          <fieldset
            className={`profile-form__radio-group${fieldInvalid("gender") ? " is-invalid" : ""}`}
            aria-labelledby="profile-gender-label"
          >
            <div id="profile-gender-label" className="form-group profile-form__radio-legend">
              <FieldLabel hint={t.profileGenderHint}>{t.profileGenderLabel}</FieldLabel>
            </div>
            <div className="profile-form__radio-options">
              <label className="profile-form__radio">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === "female"}
                  aria-invalid={fieldInvalid("gender") || undefined}
                  onChange={() => {
                    setGender("female");
                    liveValidateProfile({ gender: "female" }, ["gender"]);
                  }}
                />
                {t.profileGenderFemale}
              </label>
              <label className="profile-form__radio">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === "male"}
                  aria-invalid={fieldInvalid("gender") || undefined}
                  onChange={() => {
                    setGender("male");
                    liveValidateProfile({ gender: "male" }, ["gender"]);
                  }}
                />
                {t.profileGenderMale}
              </label>
            </div>
          </fieldset>
        </div>
      </fieldset>

      <CollapsibleToggleBlock
        enabled={upsfMember}
        label={t.profileUpsfMemberLabel}
        onEnabledChange={(checked) => {
          setUpsfMember(checked);
          liveValidateProfile({ upsfMember: checked });
        }}
      >
        {showMembershipHints && (
          <p className="form-note" role="note">
            {t.profileNameUaInfo}
          </p>
        )}
        <div className="form-row">
          <div className="form-group">
            <FieldLabel hint={showMembershipHints ? t.profileNameUaHint : undefined}>
              {t.profileFirstNameUaLabel}
            </FieldLabel>
            <input
              className={`form-control${fieldInvalid("firstNameUa") ? " is-invalid" : ""}`}
              type="text"
              autoComplete="given-name"
              maxLength={100}
              placeholder={t.profileFirstNameUaPlaceholder}
              value={firstNameUa}
              aria-invalid={fieldInvalid("firstNameUa") || undefined}
              onChange={(e) => {
                const value = e.target.value;
                setFirstNameUa(value);
                liveValidateProfile({ firstNameUa: value }, ["firstNameUa"]);
              }}
              onBlur={(e) => {
                const nextEn = fillEmptyEnFromUa(firstNameEn, e.target.value);
                setFirstNameEn(nextEn);
                if (ipscMember) {
                  liveValidateProfile(
                    { firstNameUa: e.target.value, firstNameEn: nextEn },
                    ["firstNameUa"],
                  );
                }
              }}
            />
          </div>
          <div className="form-group">
            <FieldLabel hint={showMembershipHints ? t.profileNameUaHint : undefined}>
              {t.profileLastNameUaLabel}
            </FieldLabel>
            <input
              className={`form-control${fieldInvalid("lastNameUa") ? " is-invalid" : ""}`}
              type="text"
              autoComplete="family-name"
              maxLength={100}
              placeholder={t.profileLastNameUaPlaceholder}
              value={lastNameUa}
              aria-invalid={fieldInvalid("lastNameUa") || undefined}
              onChange={(e) => {
                const value = e.target.value;
                setLastNameUa(value);
                liveValidateProfile({ lastNameUa: value }, ["lastNameUa"]);
              }}
              onBlur={(e) => {
                const nextEn = fillEmptyEnFromUa(lastNameEn, e.target.value);
                setLastNameEn(nextEn);
                if (ipscMember) {
                  liveValidateProfile(
                    { lastNameUa: e.target.value, lastNameEn: nextEn },
                    ["lastNameUa"],
                  );
                }
              }}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <FieldLabel hint={t.profileRegionHint}>{t.profileRegionLabel}</FieldLabel>
            <select
              className={`form-control${fieldInvalid("region") ? " is-invalid" : ""}`}
              value={region}
              aria-invalid={fieldInvalid("region") || undefined}
              onChange={(e) => {
                const value = e.target.value;
                setRegion(value);
                liveValidateProfile({ region: value }, ["region"]);
              }}
            >
              <option value="">{t.profileRegionPlaceholder}</option>
              {UPSF_REGIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <FieldLabel hint={t.profileCityHint}>{t.profileCityLabel}</FieldLabel>
            <input
              className="form-control"
              type="text"
              autoComplete="address-level2"
              maxLength={100}
              placeholder={t.profileCityPlaceholder}
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="form-group">
          <FieldLabel hint={t.profileClubHint}>{t.profileClubLabel}</FieldLabel>
          <input
            className={`form-control${fieldInvalid("club") ? " is-invalid" : ""}`}
            type="text"
            autoComplete="organization"
            maxLength={100}
            placeholder={t.profileClubPlaceholder}
            value={club}
            aria-invalid={fieldInvalid("club") || undefined}
            onChange={(e) => {
              const value = e.target.value;
              setClub(value);
              liveValidateProfile({ club: value }, ["club"]);
            }}
          />
        </div>
      </CollapsibleToggleBlock>

      <CollapsibleToggleBlock
        enabled={ipscMember}
        label={t.profileIpscMemberLabel}
        onEnabledChange={(checked) => {
          setIpscMember(checked);
          if (checked) {
            const nextRegion = ipscRegion || DEFAULT_IPSC_REGION;
            const nextFirst = fillEmptyEnFromUa(firstNameEn, firstNameUa);
            const nextLast = fillEmptyEnFromUa(lastNameEn, lastNameUa);
            setIpscRegion(nextRegion);
            setFirstNameEn(nextFirst);
            setLastNameEn(nextLast);
            liveValidateProfile({
              ipscMember: checked,
              ipscRegion: nextRegion,
              firstNameEn: nextFirst,
              lastNameEn: nextLast,
            });
          } else {
            liveValidateProfile({ ipscMember: checked });
          }
        }}
      >
        {showMembershipHints && (
          <p className="form-note" role="note">
            {t.profileNameEnInfo}
          </p>
        )}
        <div className="form-row">
          <div className="form-group">
            <FieldLabel hint={showMembershipHints ? t.profileNameEnHint : undefined}>
              {t.profileFirstNameEnLabel}
            </FieldLabel>
            <input
              className={`form-control${fieldInvalid("firstNameEn") ? " is-invalid" : ""}`}
              type="text"
              autoComplete="given-name"
              maxLength={100}
              placeholder={t.profileFirstNameEnPlaceholder}
              value={firstNameEn}
              aria-invalid={fieldInvalid("firstNameEn") || undefined}
              onChange={(e) => {
                const value = e.target.value;
                setFirstNameEn(value);
                liveValidateProfile({ firstNameEn: value }, ["firstNameEn"]);
              }}
            />
          </div>
          <div className="form-group">
            <FieldLabel hint={showMembershipHints ? t.profileNameEnHint : undefined}>
              {t.profileLastNameEnLabel}
            </FieldLabel>
            <input
              className={`form-control${fieldInvalid("lastNameEn") ? " is-invalid" : ""}`}
              type="text"
              autoComplete="family-name"
              maxLength={100}
              placeholder={t.profileLastNameEnPlaceholder}
              value={lastNameEn}
              aria-invalid={fieldInvalid("lastNameEn") || undefined}
              onChange={(e) => {
                const value = e.target.value;
                setLastNameEn(value);
                liveValidateProfile({ lastNameEn: value }, ["lastNameEn"]);
              }}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <FieldLabel hint={t.profileIpscMemberNumberHint}>
              {t.profileIpscMemberNumberLabel}
            </FieldLabel>
            <input
              className="form-control"
              type="text"
              autoComplete="off"
              maxLength={50}
              placeholder={t.profileIpscMemberNumberPlaceholder}
              value={ipscMemberNumber}
              onChange={(e) => {
                setIpscMemberNumber(e.target.value);
              }}
            />
          </div>
          <div className="form-group">
            <FieldLabel hint={t.profileIpscRegionHint}>{t.profileIpscRegionLabel}</FieldLabel>
            <input
              className={`form-control${fieldInvalid("ipscRegion") ? " is-invalid" : ""}`}
              type="text"
              autoComplete="off"
              maxLength={5}
              placeholder={DEFAULT_IPSC_REGION}
              value={ipscRegion}
              aria-invalid={fieldInvalid("ipscRegion") || undefined}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().slice(0, 5);
                setIpscRegion(value);
                liveValidateProfile({ ipscRegion: value }, ["ipscRegion"]);
              }}
            />
          </div>
        </div>
      </CollapsibleToggleBlock>

      {displayedError && (
        <p className="form-error" role="alert">
          {displayedError}
        </p>
      )}
      <ProfileFormActions
        busy={busy}
        submitLabel={submitLabel ?? t.profileSubmit}
        cancelLabel={cancelLabel ?? t.profileEditCancel}
        onCancel={onCancel}
      />
    </form>
  );
}
