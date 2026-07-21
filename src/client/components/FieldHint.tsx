import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Purpose text, optionally followed by italic validation rules. */
export type FieldHintContent =
  | string
  | {
      description: string;
      validation?: string;
    };

export function normalizeFieldHint(hint: FieldHintContent): {
  description: string;
  validation?: string;
} {
  if (typeof hint === "string") return { description: hint };
  return {
    description: hint.description,
    validation: hint.validation?.trim() ? hint.validation : undefined,
  };
}

function hintAriaLabel(hint: FieldHintContent): string {
  const { description, validation } = normalizeFieldHint(hint);
  return validation ? `${description} ${validation}` : description;
}

type FieldHintProps = {
  text: FieldHintContent;
};

type Placement = "right" | "top";

/**
 * Compact (i) control that reveals a short field/block hint on click
 * (and hover on fine pointers). Prefers right of the icon, falls back to
 * above when there isn't enough room. Safe inside wrapping `<label>`s.
 *
 * Structured hints show purpose first, then validation rules on a new
 * italic line.
 */
export function FieldHint({ text }: FieldHintProps) {
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>("right");
  const { description, validation } = normalizeFieldHint(text);
  const ariaLabel = hintAriaLabel(text);

  useLayoutEffect(() => {
    if (!open) return;

    const root = rootRef.current;
    const popover = popoverRef.current;
    if (!root || !popover) return;

    const gap = 6;
    const rootRect = root.getBoundingClientRect();
    // Measure natural width without the placement class fighting us.
    const popoverWidth = popover.offsetWidth;
    const spaceRight = window.innerWidth - rootRect.right - gap;
    const next: Placement = spaceRight >= Math.min(popoverWidth, 160) ? "right" : "top";
    setPlacement(next);
  }, [open, description, validation]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => {
      const root = rootRef.current;
      const popover = popoverRef.current;
      if (!root || !popover) return;
      const gap = 6;
      const rootRect = root.getBoundingClientRect();
      const popoverWidth = popover.offsetWidth;
      const spaceRight = window.innerWidth - rootRect.right - gap;
      setPlacement(spaceRight >= Math.min(popoverWidth, 160) ? "right" : "top");
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={`field-hint field-hint--${placement}${open ? " is-open" : ""}`}
      onMouseEnter={() => {
        const root = rootRef.current;
        const popover = popoverRef.current;
        if (!root || !popover) return;
        const gap = 6;
        const rootRect = root.getBoundingClientRect();
        const popoverWidth = popover.offsetWidth || 160;
        const spaceRight = window.innerWidth - rootRect.right - gap;
        setPlacement(spaceRight >= Math.min(popoverWidth, 160) ? "right" : "top");
      }}
    >
      <button
        type="button"
        className="field-hint__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={tipId}
        onMouseDown={(event) => {
          // Keep a parent <label> from focusing/activating its control.
          event.preventDefault();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span
        ref={popoverRef}
        id={tipId}
        role="tooltip"
        className="field-hint__popover"
      >
        <span className="field-hint__description">{description}</span>
        {validation ? <span className="field-hint__rules">{validation}</span> : null}
      </span>
    </span>
  );
}

/** Label text + optional (i) hint on one row. */
export function FieldLabel({
  children,
  hint,
  id,
}: {
  children: ReactNode;
  hint?: FieldHintContent;
  id?: string;
}) {
  return (
    <span className="auth-form__label-row">
      <span className="auth-form__label" id={id}>
        {children}
      </span>
      {hint ? <FieldHint text={hint} /> : null}
    </span>
  );
}
