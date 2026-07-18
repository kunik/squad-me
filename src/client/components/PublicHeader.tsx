import { Link } from "react-router-dom";
import { useLocale } from "../locale";
import type { Locale } from "../i18n";

export function PublicHeader() {
  const { locale, setLocale, t } = useLocale();

  return (
    <header className="public-header">
      <Link to="/" className="public-header__brand" aria-label="Squad Me">
        <img
          className="public-header__logo"
          src="/logo-full.svg"
          alt=""
          width={794}
          height={177}
        />
      </Link>
      <div className="public-header__actions">
        <div
          className="lang-switch"
          role="group"
          aria-label={locale === "ua" ? "Мова" : "Language"}
        >
          <LangButton
            code="ua"
            label={t.langUa}
            active={locale === "ua"}
            onSelect={setLocale}
          />
          <LangButton
            code="en"
            label={t.langEn}
            active={locale === "en"}
            onSelect={setLocale}
          />
        </div>
        <Link to="/login" className="btn btn--ghost">
          {t.login}
        </Link>
      </div>
    </header>
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
      className={`lang-switch__btn${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={() => onSelect(code)}
    >
      {label}
    </button>
  );
}
