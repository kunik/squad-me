import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
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
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number } | null>(
    null,
  );
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

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setPopoverStyle(null);
      return;
    }

    const popoverWidth = Math.min(320, window.innerWidth * 0.92);
    const popoverHeight = 360;

    function updatePosition() {
      const anchor = rootRef.current?.querySelector(".date-field");
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 8) {
        left = window.innerWidth - popoverWidth - 8;
      }
      left = Math.max(8, left);

      let top = rect.bottom + 6;
      if (top + popoverHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - popoverHeight - 6);
      }
      setPopoverStyle({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const next = parseIsoDate(value) ?? parseIsoDate(max);
    if (next) {
      setViewYear(next.year);
      setViewMonth(next.month);
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
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
          '.dp-day[aria-selected="true"]:not(:disabled)',
        ) ??
        gridRef.current?.querySelector<HTMLButtonElement>(
          '.dp-day[aria-current="date"]:not(:disabled)',
        ) ??
        gridRef.current?.querySelector<HTMLButtonElement>(
          ".dp-day:not(:disabled):not(.is-outside)",
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
    if (!(target instanceof HTMLButtonElement) || !target.classList.contains("dp-day")) {
      return;
    }
    const buttons = Array.from(
      gridRef.current?.querySelectorAll<HTMLButtonElement>(
        ".dp-day:not(:disabled)",
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

  const popover =
    open && popoverStyle ? (
      <div
        id={popoverId}
        ref={popoverRef}
        className="date-pop date-pop--portal"
        role="dialog"
        aria-modal="false"
        aria-label={t.dateFieldCalendarLabel}
        style={{
          position: "fixed",
          top: popoverStyle.top,
          left: popoverStyle.left,
          width: "min(20rem, 92vw)",
        }}
      >
        <div className="dp-nav">
          <button
            type="button"
            className="dp-nav-btn"
            aria-label={t.dateFieldPrevMonth}
            disabled={!canPrev}
            onClick={() => goMonth(-1)}
          >
            ‹
          </button>
          <div className="dp-title" aria-live="polite">
            {monthLabel(viewYear, viewMonth, locale)}
          </div>
          <button
            type="button"
            className="dp-nav-btn"
            aria-label={t.dateFieldNextMonth}
            disabled={!canNext}
            onClick={() => goMonth(1)}
          >
            ›
          </button>
        </div>

        <div className="dp-selects">
          <label>
            <span className="visually-hidden">{t.dateFieldMonthLabel}</span>
            <select
              className="form-control"
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
          <label>
            <span className="visually-hidden">{t.dateFieldYearLabel}</span>
            <select
              className="form-control"
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

        <div className="dp-weekdays" aria-hidden="true">
          {weekdays.map((day) => (
            <span key={day} className="dp-weekday">
              {day}
            </span>
          ))}
        </div>

        <div
          ref={gridRef}
          className="dp-grid"
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
                  "dp-day",
                  cell.outside ? "is-outside" : "",
                  isSelected ? "is-selected" : "",
                  isToday && !isSelected ? "is-today" : "",
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
    ) : null;

  return (
    <div className="form-group date-field-wrap" ref={rootRef}>
      <FieldLabel id={`${fieldId}-label`} htmlFor={fieldId} hint={hint}>
        {label}
      </FieldLabel>
      <div className={`input-affix date-field${invalid ? " is-invalid" : ""}`}>
        <input
          ref={inputRef}
          id={fieldId}
          type="text"
          className={`form-control${invalid ? " is-invalid" : ""}`}
          inputMode="numeric"
          autoComplete="bday"
          placeholder={t.dateFieldPlaceholder}
          spellCheck={false}
          value={draft}
          disabled={disabled}
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
          className="affix cal-btn"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          aria-label={t.dateFieldCalendarLabel}
          disabled={disabled}
          onClick={() => (open ? closePicker("calendar") : openPicker())}
        >
          <CalendarIcon />
        </button>
      </div>

      {popover && createPortal(popover, document.body)}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}
