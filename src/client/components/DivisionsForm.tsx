import { useRef, useState, type FormEvent } from "react";
import { useLocale } from "../locale";
import type { DisciplineBlock, PowerFactor, ProfileInput, ProfileView } from "../lib/authApi";
import { translateAuthError } from "../lib/authErrors";
import {
  CARBINE_DIVISIONS,
  DISCIPLINE_DEFAULT_DIVISION,
  DISCIPLINE_DEFAULT_POWER_FACTOR,
  PCC_MINI_RIFLE_DIVISIONS,
  PISTOL_DIVISIONS,
  POWER_FACTORS,
  SHOTGUN_DIVISIONS,
  type DisciplineKey,
} from "../lib/disciplines";
import {
  validateDivisionsSectionClient,
  type ProfileClientErrorCode,
  type ProfileFormFieldKey,
} from "../lib/profileFormValidation";
import { ProfileFormActions } from "./ProfileFormActions";

export type DivisionsFormProps = {
  initialValues?: Partial<ProfileView>;
  submitting?: boolean;
  /** Already-translated error string from a failed server call. */
  serverError?: string | null;
  submitLabel?: string;
  onSubmit: (values: ProfileInput) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
  cancelLabel?: string;
};

type DisciplineUiKey = DisciplineKey;

const DISCIPLINE_OPTIONS: Record<DisciplineUiKey, readonly string[]> = {
  pistol: PISTOL_DIVISIONS,
  carbine: CARBINE_DIVISIONS,
  pccMiniRifle: PCC_MINI_RIFLE_DIVISIONS,
  shotgun: SHOTGUN_DIVISIONS,
};

function emptyDiscipline(key: DisciplineUiKey): DisciplineBlock {
  return {
    enabled: false,
    division: null,
    powerFactor: DISCIPLINE_DEFAULT_POWER_FACTOR[key],
  };
}

/**
 * Divisions section editor: four discipline blocks with division / power factor.
 */
export function DivisionsForm({
  initialValues,
  submitting,
  serverError,
  submitLabel,
  onSubmit,
  onDirtyChange,
  onCancel,
  cancelLabel,
}: DivisionsFormProps) {
  const { t } = useLocale();
  const formRef = useRef<HTMLFormElement>(null);

  const [pistol, setPistol] = useState(initialValues?.pistol ?? emptyDiscipline("pistol"));
  const [carbine, setCarbine] = useState(initialValues?.carbine ?? emptyDiscipline("carbine"));
  const [pccMiniRifle, setPccMiniRifle] = useState(
    initialValues?.pccMiniRifle ?? emptyDiscipline("pccMiniRifle"),
  );
  const [shotgun, setShotgun] = useState(initialValues?.shotgun ?? emptyDiscipline("shotgun"));

  const [clientError, setClientError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<readonly ProfileFormFieldKey[]>([]);
  const touchedFieldsRef = useRef(new Set<ProfileFormFieldKey>());
  const submitAttemptedRef = useRef(false);

  function markDirty() {
    onDirtyChange?.(true);
  }

  function messageForCode(code: ProfileClientErrorCode): string {
    switch (code) {
      case "division_required":
        return t.profileErrorDivisionRequired;
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

  function liveValidateDivisions(next: {
    pistol?: DisciplineBlock;
    carbine?: DisciplineBlock;
    pccMiniRifle?: DisciplineBlock;
    shotgun?: DisciplineBlock;
  } = {}) {
    const failure = validateDivisionsSectionClient({
      pistol: next.pistol ?? pistol,
      carbine: next.carbine ?? carbine,
      pccMiniRifle: next.pccMiniRifle ?? pccMiniRifle,
      shotgun: next.shotgun ?? shotgun,
    });
    if (!failure) {
      setInvalidFields([]);
      setClientError(null);
      return;
    }
    const visible = submitAttemptedRef.current
      ? failure.fields
      : failure.fields.filter((field) => touchedFieldsRef.current.has(field));
    setInvalidFields(visible);
    setClientError(
      visible.length === 0 ? null : messageForCode(failure.code),
    );
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

    const failure = validateDivisionsSectionClient({
      pistol,
      carbine,
      pccMiniRifle,
      shotgun,
    });
    if (failure) {
      for (const field of failure.fields) touchedFieldsRef.current.add(field);
      showValidationFailure(failure);
      return;
    }
    setInvalidFields([]);
    setClientError(null);
    onSubmit({
      section: "disciplines",
      pistol: pistol.enabled
        ? {
            enabled: true,
            division: pistol.division,
            powerFactor: pistol.powerFactor ?? "minor",
          }
        : { enabled: false, division: null, powerFactor: null },
      carbine: carbine.enabled
        ? {
            enabled: true,
            division: carbine.division,
            powerFactor: carbine.powerFactor ?? "minor",
          }
        : { enabled: false, division: null, powerFactor: null },
      pccMiniRifle: pccMiniRifle.enabled
        ? {
            enabled: true,
            division: pccMiniRifle.division,
            powerFactor: pccMiniRifle.powerFactor ?? "minor",
          }
        : { enabled: false, division: null, powerFactor: null },
      shotgun: shotgun.enabled
        ? {
            enabled: true,
            division: shotgun.division,
            powerFactor: shotgun.powerFactor ?? "major",
          }
        : { enabled: false, division: null, powerFactor: null },
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
      <DisciplineFields
        label={t.profileDisciplinePistolLabel}
        divisionLabels={t.profileDivisionPistol}
        block={pistol}
        setBlock={(next) => {
          touchedFieldsRef.current.add("pistol");
          setPistol(next);
          liveValidateDivisions({ pistol: next });
        }}
        disciplineKey="pistol"
        divisionInvalid={fieldInvalid("pistol")}
        divisionLabel={t.profileDivisionLabel}
        powerFactorLabel={t.profilePowerFactorLabel}
        powerFactorLabels={t.profilePowerFactor}
      />
      <DisciplineFields
        label={t.profileDisciplineCarbineLabel}
        divisionLabels={t.profileDivisionCarbine}
        block={carbine}
        setBlock={(next) => {
          touchedFieldsRef.current.add("carbine");
          setCarbine(next);
          liveValidateDivisions({ carbine: next });
        }}
        disciplineKey="carbine"
        divisionInvalid={fieldInvalid("carbine")}
        divisionLabel={t.profileDivisionLabel}
        powerFactorLabel={t.profilePowerFactorLabel}
        powerFactorLabels={t.profilePowerFactor}
      />
      <DisciplineFields
        label={t.profileDisciplinePccLabel}
        divisionLabels={t.profileDivisionPcc}
        block={pccMiniRifle}
        setBlock={(next) => {
          touchedFieldsRef.current.add("pccMiniRifle");
          setPccMiniRifle(next);
          liveValidateDivisions({ pccMiniRifle: next });
        }}
        disciplineKey="pccMiniRifle"
        divisionInvalid={fieldInvalid("pccMiniRifle")}
        divisionLabel={t.profileDivisionLabel}
        powerFactorLabel={t.profilePowerFactorLabel}
        powerFactorLabels={t.profilePowerFactor}
      />
      <DisciplineFields
        label={t.profileDisciplineShotgunLabel}
        divisionLabels={t.profileDivisionShotgun}
        block={shotgun}
        setBlock={(next) => {
          touchedFieldsRef.current.add("shotgun");
          setShotgun(next);
          liveValidateDivisions({ shotgun: next });
        }}
        disciplineKey="shotgun"
        divisionInvalid={fieldInvalid("shotgun")}
        divisionLabel={t.profileDivisionLabel}
        powerFactorLabel={t.profilePowerFactorLabel}
        powerFactorLabels={t.profilePowerFactor}
      />

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

function DisciplineFields({
  label,
  block,
  setBlock,
  disciplineKey,
  divisionLabels,
  divisionLabel,
  divisionInvalid = false,
  powerFactorLabel,
  powerFactorLabels,
}: {
  label: string;
  block: DisciplineBlock;
  setBlock: (next: DisciplineBlock) => void;
  disciplineKey: DisciplineUiKey;
  divisionLabels: Record<string, string>;
  divisionLabel: string;
  divisionInvalid?: boolean;
  powerFactorLabel: string;
  powerFactorLabels: Record<PowerFactor, string>;
}) {
  return (
    <fieldset className="profile-form__block profile-form__toggle-block">
      <label className="profile-form__checkbox">
        <input
          type="checkbox"
          checked={block.enabled}
          onChange={(e) => {
            const enabled = e.target.checked;
            setBlock({
              enabled,
              division: enabled
                ? (block.division ?? DISCIPLINE_DEFAULT_DIVISION[disciplineKey])
                : null,
              powerFactor: enabled
                ? (block.powerFactor ?? DISCIPLINE_DEFAULT_POWER_FACTOR[disciplineKey])
                : DISCIPLINE_DEFAULT_POWER_FACTOR[disciplineKey],
            });
          }}
        />
        {label}
        <span
          className={`profile-form__chevron${block.enabled ? " is-open" : ""}`}
          aria-hidden="true"
        />
      </label>
      {block.enabled && (
        <div className="profile-form__toggle-body">
          <div className="form-row">
            <label className="form-group">
              <span className="form-label">{divisionLabel}</span>
              <select
                className={`form-control${divisionInvalid ? " is-invalid" : ""}`}
                value={block.division ?? ""}
                aria-invalid={divisionInvalid || undefined}
                onChange={(e) =>
                  setBlock({
                    ...block,
                    division: e.target.value || null,
                  })
                }
                required
              >
                <option value="">—</option>
                {DISCIPLINE_OPTIONS[disciplineKey].map((value) => (
                  <option key={value} value={value}>
                    {divisionLabels[value] ?? value}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-group">
              <span className="form-label">{powerFactorLabel}</span>
              <select
                className="form-control"
                value={block.powerFactor ?? DISCIPLINE_DEFAULT_POWER_FACTOR[disciplineKey]}
                onChange={(e) =>
                  setBlock({
                    ...block,
                    powerFactor: e.target.value as PowerFactor,
                  })
                }
              >
                {POWER_FACTORS.map((value) => (
                  <option key={value} value={value}>
                    {powerFactorLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </fieldset>
  );
}
