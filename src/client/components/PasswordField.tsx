import { useState, type ChangeEvent } from "react";
import { useLocale } from "../locale";
import { FieldLabel, type FieldHintContent } from "./FieldHint";

type PasswordFieldProps = {
  id?: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: "current-password" | "new-password";
  hint?: FieldHintContent;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
};

export function PasswordField({
  id,
  name = "password",
  label,
  value,
  onChange,
  autoComplete = "current-password",
  hint,
  minLength,
  maxLength = 128,
  required,
  disabled,
}: PasswordFieldProps) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const inputId = id ?? "password";

  return (
    <div className="form-group">
      <FieldLabel id={inputId} hint={hint}>
        {label}
      </FieldLabel>
      <div className="password-field">
        <input
          id={inputId}
          name={name}
          className="form-control"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          aria-labelledby={inputId}
        />
        <button
          type="button"
          className="password-reveal-btn"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? t.hidePassword : t.showPassword}
          disabled={disabled}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
