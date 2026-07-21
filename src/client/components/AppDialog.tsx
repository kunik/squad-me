import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

type AppDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  busy?: boolean;
  /** Visual tone: danger uses the red-accented delete style. */
  tone?: "default" | "danger";
  onClose: () => void;
  /** Prefer this element when the dialog opens; otherwise the first focusable. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Prefer this element when the dialog closes; otherwise the previously focused one. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  children?: ReactNode;
  actions: ReactNode;
};

/**
 * Shared in-app modal shell (dark app chrome, not `window.confirm`).
 * Handles backdrop dismiss, Escape, body scroll lock, focus trap, and return focus.
 */
export function AppDialog({
  open,
  title,
  description,
  busy = false,
  tone = "default",
  onClose,
  initialFocusRef,
  returnFocusRef,
  children,
  actions,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);
  const autoTitleId = useId();
  const autoDescriptionId = useId();
  const titleId = `app-dialog-title-${autoTitleId}`;
  const descriptionId = description
    ? `app-dialog-description-${autoDescriptionId}`
    : undefined;

  busyRef.current = busy;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      const preferred = initialFocusRef?.current;
      if (preferred) {
        preferred.focus();
        return;
      }
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!busyRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const restore = returnFocusRef?.current ?? previouslyFocused.current;
      restore?.focus?.();
    };
  }, [open, initialFocusRef, returnFocusRef]);

  if (!open) return null;

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !busyRef.current) {
      onClose();
    }
  }

  return (
    <div
      className="app-dialog__backdrop"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        className={`app-dialog${tone === "danger" ? " app-dialog--danger" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-busy={busy || undefined}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} className="app-dialog__title">
          {title}
        </h2>
        {typeof description === "string" ? (
          <p id={descriptionId} className="app-dialog__description">
            {description}
          </p>
        ) : description ? (
          <div id={descriptionId} className="app-dialog__description">
            {description}
          </div>
        ) : null}
        {children}
        <div className="app-dialog__actions">{actions}</div>
      </div>
    </div>
  );
}
