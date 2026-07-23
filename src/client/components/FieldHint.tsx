import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

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

type PopCoords = {
  top: number;
  left: number;
};

const GAP = 6;
const EDGE = 8;

function resolvePlacement(
  rootRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number,
): { placement: Placement; coords: PopCoords } {
  const spaceRight = window.innerWidth - rootRect.right - GAP;
  const placement: Placement =
    spaceRight >= Math.min(popoverWidth, 160) ? "right" : "top";

  if (placement === "right") {
    let top = rootRect.top + rootRect.height / 2 - popoverHeight / 2;
    top = Math.min(
      Math.max(EDGE, top),
      window.innerHeight - popoverHeight - EDGE,
    );
    return {
      placement,
      coords: { top, left: rootRect.right + 8 },
    };
  }

  let left = rootRect.left + rootRect.width / 2 - popoverWidth / 2;
  left = Math.min(
    Math.max(EDGE, left),
    window.innerWidth - popoverWidth - EDGE,
  );
  let top = rootRect.top - popoverHeight - GAP;
  if (top < EDGE) {
    top = rootRect.bottom + GAP;
  }
  return { placement, coords: { top, left } };
}

/**
 * Compact (i) control that reveals a short field/block hint on click
 * (and hover on fine pointers). Prefers right of the icon, falls back to
 * above when there isn't enough room. Portaled to `document.body` so
 * `overflow: hidden` parents (e.g. `.profile-form__panel`) cannot clip it.
 * Keep outside wrapping `<label>`s for the whole control — use a
 * `.form-group` wrapper instead.
 *
 * Structured hints show purpose first, then validation rules on a new
 * italic line. Not in the Tab order (`tabIndex={-1}`); open via pointer.
 */
export function FieldHint({ text }: FieldHintProps) {
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [placement, setPlacement] = useState<Placement>("right");
  const [coords, setCoords] = useState<PopCoords | null>(null);
  const { description, validation } = normalizeFieldHint(text);
  const ariaLabel = hintAriaLabel(text);
  const visible = open || hovered;

  useLayoutEffect(() => {
    if (!visible) {
      setCoords(null);
      return;
    }

    const root = rootRef.current;
    const popover = popoverRef.current;
    if (!root || !popover) return;

    const rootRect = root.getBoundingClientRect();
    const popoverWidth = popover.offsetWidth || Math.min(256, window.innerWidth * 0.7);
    const popoverHeight = popover.offsetHeight || 40;
    const next = resolvePlacement(rootRect, popoverWidth, popoverHeight);
    setPlacement(next.placement);
    setCoords(next.coords);
  }, [visible, description, validation]);

  useEffect(() => {
    if (!visible) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => {
      const root = rootRef.current;
      const popover = popoverRef.current;
      if (!root || !popover) return;
      const rootRect = root.getBoundingClientRect();
      const next = resolvePlacement(
        rootRect,
        popover.offsetWidth || 160,
        popover.offsetHeight || 40,
      );
      setPlacement(next.placement);
      setCoords(next.coords);
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
  }, [visible]);

  const popStyle: CSSProperties | undefined = coords
    ? { top: coords.top, left: coords.left }
    : undefined;

  const tip = (
    <span
      ref={popoverRef}
      id={tipId}
      role="tooltip"
      className={`hint-pop hint-pop--portal field-hint--${placement}${visible ? " is-visible" : ""}`}
      style={popStyle}
    >
      <span>{description}</span>
      {validation ? <span className="hint-rules">{validation}</span> : null}
    </span>
  );

  return (
    <span
      ref={rootRef}
      className={`field-hint${open ? " is-open" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="hint-trigger"
        tabIndex={-1}
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
      {typeof document !== "undefined" ? createPortal(tip, document.body) : tip}
    </span>
  );
}

/**
 * Label text + optional (i) hint on one row. Pass `htmlFor` matching the
 * control’s `id` so clicking the label focuses the field (hint stays outside
 * the `<label>` so it does not steal that click).
 */
export function FieldLabel({
  children,
  hint,
  id,
  htmlFor,
}: {
  children: ReactNode;
  hint?: FieldHintContent;
  id?: string;
  htmlFor?: string;
}) {
  return (
    <span className="form-label-row">
      <label className="form-label" id={id} htmlFor={htmlFor}>
        {children}
      </label>
      {hint ? <FieldHint text={hint} /> : null}
    </span>
  );
}
