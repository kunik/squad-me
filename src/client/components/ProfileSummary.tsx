import type { ReactNode } from "react";
import { useLocale } from "../locale";
import type { DisciplineBlock, ProfileView } from "../lib/authApi";
import { CollapsibleToggleBlock } from "./CollapsibleToggleBlock";
import { FieldLabel, type FieldHintContent } from "./FieldHint";

type ProfileSummaryProps = {
  mode: "profile" | "divisions";
  profile: Partial<ProfileView> | null;
  /**
   * UPSF/IPSC intro notes + name FieldHints. Shown only during profile
   * onboarding; omitted on normal `/profile` view.
   */
  showMembershipHints?: boolean;
};

function displayValue(value: string | null | undefined, empty: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : empty;
}

/**
 * Read-only profile data for the `/profile` right pane. Mirrors
 * `ProfileForm` block order (nickname → birth/gender → UPSF → IPSC →
 * disciplines). Membership/discipline details show only when enabled.
 * Section title + Edit/Cancel live in `ProfileSectionHeader`.
 */
export function ProfileSummary({
  mode,
  profile,
  showMembershipHints = false,
}: ProfileSummaryProps) {
  const { t } = useLocale();
  const empty = t.profileSummaryEmpty;
  const nameUaHint = showMembershipHints ? t.profileNameUaHint : undefined;
  const nameEnHint = showMembershipHints ? t.profileNameEnHint : undefined;

  const genderLabel =
    profile?.gender === "male"
      ? t.profileGenderMale
      : profile?.gender === "female"
        ? t.profileGenderFemale
        : empty;

  return (
    <div className="profile-form profile-form--readonly">
      {mode === "profile" && (
        <>
          <fieldset className="profile-form__block profile-form__panel" aria-label={t.profileSummaryTitle}>
            <div className="profile-form__panel-body">
              <ReadonlyField
                label={t.profileNicknameLabel}
                value={displayValue(profile?.nickname, empty)}
                hint={t.profileNicknameHint}
              />
              <div className="form-row">
                <ReadonlyField
                  label={t.profileBirthDateLabel}
                  value={displayValue(profile?.birthDate, empty)}
                  hint={t.profileBirthDateHint}
                />
                <fieldset className="profile-form__radio-group" aria-labelledby="profile-summary-gender-label">
                  <div className="form-group profile-form__radio-legend">
                    <FieldLabel id="profile-summary-gender-label" hint={t.profileGenderHint}>
                      {t.profileGenderLabel}
                    </FieldLabel>
                  </div>
                  <p className="field-view-value">{genderLabel}</p>
                </fieldset>
              </div>
            </div>
          </fieldset>

          <MembershipSummary
            checked={Boolean(profile?.upsfMember)}
            label={t.profileUpsfMemberLabel}
          >
            {showMembershipHints && (
              <p className="form-note" role="note">
                {t.profileNameUaInfo}
              </p>
            )}
            <div className="form-row">
              <ReadonlyField
                label={t.profileFirstNameUaLabel}
                value={displayValue(profile?.firstNameUa, empty)}
                hint={nameUaHint}
              />
              <ReadonlyField
                label={t.profileLastNameUaLabel}
                value={displayValue(profile?.lastNameUa, empty)}
                hint={nameUaHint}
              />
            </div>
            <div className="form-row">
              <ReadonlyField
                label={t.profileRegionLabel}
                value={displayValue(profile?.region, empty)}
                hint={t.profileRegionHint}
              />
              <ReadonlyField
                label={t.profileCityLabel}
                value={displayValue(profile?.city, empty)}
                hint={t.profileCityHint}
              />
            </div>
            <ReadonlyField
              label={t.profileClubLabel}
              value={displayValue(profile?.club, empty)}
              hint={t.profileClubHint}
            />
          </MembershipSummary>

          <MembershipSummary
            checked={Boolean(profile?.ipscMember)}
            label={t.profileIpscMemberLabel}
          >
            {showMembershipHints && (
              <p className="form-note" role="note">
                {t.profileNameEnInfo}
              </p>
            )}
            <div className="form-row">
              <ReadonlyField
                label={t.profileFirstNameEnLabel}
                value={displayValue(profile?.firstNameEn, empty)}
                hint={nameEnHint}
              />
              <ReadonlyField
                label={t.profileLastNameEnLabel}
                value={displayValue(profile?.lastNameEn, empty)}
                hint={nameEnHint}
              />
            </div>
            <div className="form-row">
              <ReadonlyField
                label={t.profileIpscMemberNumberLabel}
                value={displayValue(profile?.ipscMemberNumber, empty)}
                hint={t.profileIpscMemberNumberHint}
              />
              <ReadonlyField
                label={t.profileIpscRegionLabel}
                value={displayValue(profile?.ipscRegion, empty)}
                hint={t.profileIpscRegionHint}
              />
            </div>
          </MembershipSummary>
        </>
      )}

      {mode === "divisions" && (
        <>
          <DisciplineSummary
            label={t.profileDisciplinePistolLabel}
            block={profile?.pistol}
            divisionLabels={t.profileDivisionPistol}
          />
          <DisciplineSummary
            label={t.profileDisciplineCarbineLabel}
            block={profile?.carbine}
            divisionLabels={t.profileDivisionCarbine}
          />
          <DisciplineSummary
            label={t.profileDisciplinePccLabel}
            block={profile?.pccMiniRifle}
            divisionLabels={t.profileDivisionPcc}
          />
          <DisciplineSummary
            label={t.profileDisciplineShotgunLabel}
            block={profile?.shotgun}
            divisionLabels={t.profileDivisionShotgun}
          />
        </>
      )}
    </div>
  );
}

function MembershipSummary({
  checked,
  label,
  children,
}: {
  checked: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <CollapsibleToggleBlock enabled={checked} label={label}>
      {children}
    </CollapsibleToggleBlock>
  );
}

function DisciplineSummary({
  label,
  block,
  divisionLabels,
}: {
  label: string;
  block: DisciplineBlock | undefined;
  divisionLabels: Record<string, string>;
}) {
  const { t } = useLocale();
  const empty = t.profileSummaryEmpty;
  const enabled = Boolean(block?.enabled);
  const division =
    block?.division && divisionLabels[block.division]
      ? divisionLabels[block.division]
      : displayValue(block?.division, empty);
  const powerFactor =
    block?.powerFactor === "minor" || block?.powerFactor === "major"
      ? t.profilePowerFactor[block.powerFactor]
      : empty;

  return (
    <CollapsibleToggleBlock enabled={enabled} label={label}>
      <p
        className="field-view-value"
        aria-label={`${t.profileDivisionLabel}: ${division}. ${t.profilePowerFactorLabel}: ${powerFactor}`}
      >
        {division} - {powerFactor}
      </p>
    </CollapsibleToggleBlock>
  );
}

function ReadonlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: FieldHintContent;
}) {
  return (
    <div className="form-group">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <p className="field-view-value">{value}</p>
    </div>
  );
}
