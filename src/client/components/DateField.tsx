import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useLocale } from "../locale";
import {
  buildMonthGrid,
  compareIsoDates,
  formatIsoDisplay,
  monthLabel,
  parseDisplayDate,
  parseIsoDate,
  shiftMonth,
  toIsoDate,
  todayIsoDate,
  weekdayLabels,
  yearOptions,
} from "../lib/dateField";
import { FieldLabel, type FieldHintContent } from "./FieldHint";

type DateFieldProps = {
  id?: string;
  label: string;
  /** Optional (i) hint shown next to the label. */
  hint?: FieldHintContent;
  value: string;
  onChange: (value: string) => void;
  /** Inclusive max ISO date (defaults to today). */
  max?: string;
  disabled?: boolean;
  /** Explicit validation failure (PROFILE-006); not native :user-invalid. */
  invalid?: boolean;
};

export function DateField({
  id,
  label,
  hint,
  value,
  onChange,
  max = todayIsoDate(),
  disabled = false,
  invalid = false,
}: DateFieldProps) {
  const { locale, t } = useLocale();
  const autoId = useId();
  const fieldId = id ?? `date-field-${autoId}`;
  const popoverId = `${fieldId}-popover`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() =>
    value ? formatIsoDisplay(value, locale) : "",
  );

  const initial = parseIsoDate(value) ?? parseIsoDate(max) ?? {
    year: new Date().getFullYear(),
    month: 1,
    day: 1,
  };
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  useEffect(() => {
    if (!focused) {
      setDraft(value ? formatIsoDisplay(value, locale) : "");
    }
  }, [value, locale, focused]);

  useEffect(() => {
    if (!open) return;

    const next = parseIsoDate(value) ?? parseIsoDate(max);
    if (next) {
      setViewYear(next.year);
      setViewMonth(next.month);
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        inputRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    requestAnimationFrame(() => {
      const preferred =
        gridRef.current?.querySelector<HTMLButtonElement>(
          '.date-field__day[aria-selected="true"]:not(:disabled)',
        ) ??
        gridRef.current?.querySelector<HTMLButtonElement>(
          '.date-field__day[aria-current="date"]:not(:disabled)',
        ) ??
        gridRef.current?.querySelector<HTMLButtonElement>(
          ".date-field__day:not(:disabled):not(.date-field__day--outside)",
        );
      preferred?.focus();
    });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, value, max]);

  const weekdays = weekdayLabels(locale);
  const days = buildMonthGrid(viewYear, viewMonth);
  const years = yearOptions(max);
  const today = todayIsoDate();
  const minYear = years[years.length - 1] ?? viewYear;

  function closePicker(focusTarget: "input" | "calendar" = "input") {
    setOpen(false);
    if (focusTarget === "calendar") {
      calendarBtnRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }

  function openPicker() {
    if (disabled) return;
    setOpen(true);
  }

  function selectDay(iso: string) {
    if (compareIsoDates(iso, max) > 0) return;
    onChange(iso);
    setDraft(formatIsoDisplay(iso, locale));
    closePicker("input");
  }

  function commitDraft(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      if (value) onChange("");
      setDraft("");
      return;
    }

    const parsed = parseDisplayDate(trimmed);
    if (!parsed) {
      setDraft(value ? formatIsoDisplay(value, locale) : "");
      return;
    }

    const iso = toIsoDate(parsed.year, parsed.month, parsed.day);
    if (compareIsoDates(iso, max) > 0) {
      setDraft(value ? formatIsoDisplay(value, locale) : "");
      return;
    }

    onChange(iso);
    setDraft(formatIsoDisplay(iso, locale));
  }

  function goMonth(delta: number) {
    const next = shiftMonth(viewYear, viewMonth, delta);
    if (next.year < minYear) return;
    const nextMonthStart = `${String(next.year).padStart(4, "0")}-${String(next.month).padStart(2, "0")}-01`;
    const maxMonthStart = `${max.slice(0, 7)}-01`;
    if (compareIsoDates(nextMonthStart, maxMonthStart) > 0) return;
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value);
  }

  function handleInputBlur() {
    setFocused(false);
    commitDraft(draft);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft(draft);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openPicker();
    }
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.classList.contains("date-field__day")) {
      return;
    }
    const buttons = Array.from(
      gridRef.current?.querySelectorAll<HTMLButtonElement>(
        ".date-field__day:not(:disabled)",
      ) ?? [],
    );
    const index = buttons.indexOf(target);
    if (index < 0) return;

    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = index + 1;
    else if (event.key === "ArrowLeft") nextIndex = index - 1;
    else if (event.key === "ArrowDown") nextIndex = index + 7;
    else if (event.key === "ArrowUp") nextIndex = index - 7;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = buttons.length - 1;
    else return;

    if (nextIndex < 0 || nextIndex >= buttons.length) return;
    event.preventDefault();
    buttons[nextIndex]?.focus();
  }

  const canPrev = shiftMonth(viewYear, viewMonth, -1).year >= minYear;
  const canNext = (() => {
    const next = shiftMonth(viewYear, viewMonth, 1);
    const nextMonthStart = `${String(next.year).padStart(4, "0")}-${String(next.month).padStart(2, "0")}-01`;
    return compareIsoDates(nextMonthStart, `${max.slice(0, 7)}-01`) <= 0;
  })();

  return (
    <div className="auth-form__field date-field" ref={rootRef}>
      <FieldLabel id={`${fieldId}-label`} hint={hint}>
        {label}
      </FieldLabel>
      <div className="date-field__control">
        <input
          ref={inputRef}
          id={fieldId}
          type="text"
          className={`auth-form__input date-field__input${invalid ? " is-invalid" : ""}`}
          inputMode="numeric"
          autoComplete="bday"
          placeholder={t.dateFieldPlaceholder}
          spellCheck={false}
          value={draft}
          disabled={disabled}
          aria-labelledby={`${fieldId}-label`}
          aria-invalid={invalid || undefined}
          aria-controls={open ? popoverId : undefined}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
        <button
          ref={calendarBtnRef}
          type="button"
          className="date-field__calendar-btn"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          aria-label={t.dateFieldCalendarLabel}
          disabled={disabled}
          onClick={() => (open ? closePicker("calendar") : openPicker())}
        >
          <img
            className="date-field__icon"
            src="/icon-calendar.png"
            alt=""
            width={22}
            height={22}
            aria-hidden="true"
          />
        </button>
      </div>

      {open && (
        <div
          id={popoverId}
          className="date-field__popover"
          role="dialog"
          aria-modal="false"
          aria-label={t.dateFieldCalendarLabel}
        >
          <div className="date-field__nav">
            <button
              type="button"
              className="date-field__nav-btn"
              aria-label={t.dateFieldPrevMonth}
              disabled={!canPrev}
              onClick={() => goMonth(-1)}
            >
              ‹
            </button>
            <div className="date-field__nav-title" aria-live="polite">
              {monthLabel(viewYear, viewMonth, locale)}
            </div>
            <button
              type="button"
              className="date-field__nav-btn"
              aria-label={t.dateFieldNextMonth}
              disabled={!canNext}
              onClick={() => goMonth(1)}
            >
              ›
            </button>
          </div>

          <div className="date-field__selects">
            <label className="date-field__select-wrap">
              <span className="visually-hidden">{t.dateFieldMonthLabel}</span>
              <select
                className="auth-form__input date-field__select"
                value={viewMonth}
                aria-label={t.dateFieldMonthLabel}
                onChange={(e) => setViewMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1;
                  const name = new Intl.DateTimeFormat(
                    locale === "ua" ? "uk-UA" : "en-GB",
                    { month: "long" },
                  ).format(new Date(2024, i, 1));
                  return (
                    <option key={month} value={month}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="date-field__select-wrap">
              <span className="visually-hidden">{t.dateFieldYearLabel}</span>
              <select
                className="auth-form__input date-field__select"
                value={viewYear}
                aria-label={t.dateFieldYearLabel}
                onChange={(e) => setViewYear(Number(e.target.value))}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="date-field__weekdays" aria-hidden="true">
            {weekdays.map((day) => (
              <span key={day} className="date-field__weekday">
                {day}
              </span>
            ))}
          </div>

          <div
            ref={gridRef}
            className="date-field__grid"
            role="grid"
            aria-label={monthLabel(viewYear, viewMonth, locale)}
            onKeyDown={handleGridKeyDown}
          >
            {days.map((cell) => {
              const isDisabled = compareIsoDates(cell.iso, max) > 0;
              const isSelected = cell.iso === value;
              const isToday = cell.iso === today;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  role="gridcell"
                  className={[
                    "date-field__day",
                    cell.outside ? "date-field__day--outside" : "",
                    isSelected ? "date-field__day--selected" : "",
                    isToday && !isSelected ? "date-field__day--today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={isDisabled}
                  aria-selected={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  tabIndex={-1}
                  onClick={() => selectDay(cell.iso)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
