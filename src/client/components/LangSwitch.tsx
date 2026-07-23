import { useLocale } from "../locale";
import type { Locale } from "../i18n";

type LangSwitchProps = {
  className?: string;
};

/** Compact segmented UA/EN language toggle (Gentelella segmented styling). */
export function LangSwitch({ className = "" }: LangSwitchProps) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div
      className={`lang-seg${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={t.headerLanguage}
    >
      <LangButton code="ua" label={t.langUa} active={locale === "ua"} onSelect={setLocale} />
      <LangButton code="en" label={t.langEn} active={locale === "en"} onSelect={setLocale} />
    </div>
  );
}

function LangButton({
  code,
  label,
  active,
  onSelect,
}: {
  code: Locale;
  label: string;
  active: boolean;
  onSelect: (locale: Locale) => void;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      aria-pressed={active}
      onClick={() => onSelect(code)}
    >
      {label}
    </button>
  );
}
