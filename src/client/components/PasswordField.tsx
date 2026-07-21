import { useState, type ChangeEvent } from "react";
import { useLocale } from "../locale";
import { FieldLabel, type FieldHintContent } from "./FieldHint";

type PasswordFieldProps = {
  id?: string;
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
    <label className="auth-form__field" htmlFor={inputId}>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <span className="auth-form__password">
        <input
          id={inputId}
          className="auth-form__input auth-form__input--password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
        />
        <button
          type="button"
          className="auth-form__password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? t.hidePassword : t.showPassword}
        >
          {visible ? t.hidePassword : t.showPassword}
        </button>
      </span>
    </label>
  );
}
