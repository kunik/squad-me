import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ContextType,
} from "react";
import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";

export type NavigationBlockerState = "unblocked" | "blocked";

export type NavigationBlocker = {
  state: NavigationBlockerState;
  proceed: () => void;
  reset: () => void;
};

type NavigatorLike = NonNullable<ContextType<typeof NavigationContext>["navigator"]>;

/**
 * Patches React Router's navigator so in-app navigation can be deferred while
 * `shouldBlock` is true. Works with `BrowserRouter` / `MemoryRouter` (unlike
 * `useBlocker`, which requires a data router).
 */
export function patchNavigatorForBlocker(
  navigator: NavigatorLike,
  shouldBlock: () => boolean,
  onBlocked: (retry: () => void) => void,
): () => void {
  const originalPush = navigator.push.bind(navigator);
  const originalReplace = navigator.replace.bind(navigator);
  const originalGo = navigator.go?.bind(navigator);
  let bypass = false;

  const wrapNavigate =
    (original: NavigatorLike["push"]) =>
    (...args: Parameters<NavigatorLike["push"]>) => {
      if (bypass || !shouldBlock()) {
        original(...args);
        return;
      }
      onBlocked(() => {
        bypass = true;
        try {
          original(...args);
        } finally {
          bypass = false;
        }
      });
    };

  navigator.push = wrapNavigate(originalPush);
  navigator.replace = wrapNavigate(originalReplace);
  if (originalGo && navigator.go) {
    navigator.go = (delta: number) => {
      if (bypass || !shouldBlock()) {
        originalGo(delta);
        return;
      }
      onBlocked(() => {
        bypass = true;
        try {
          originalGo(delta);
        } finally {
          bypass = false;
        }
      });
    };
  }

  return () => {
    navigator.push = originalPush;
    navigator.replace = originalReplace;
    if (originalGo && navigator.go) {
      navigator.go = originalGo;
    }
  };
}

/**
 * BrowserRouter-compatible stand-in for React Router's data-router `useBlocker`.
 */
export function useNavigationBlocker(when: boolean): NavigationBlocker {
  const { navigator } = useContext(NavigationContext);
  const [state, setState] = useState<NavigationBlockerState>("unblocked");
  const whenRef = useRef(when);
  const retryRef = useRef<(() => void) | null>(null);

  whenRef.current = when;

  const proceed = useCallback(() => {
    const retry = retryRef.current;
    retryRef.current = null;
    setState("unblocked");
    retry?.();
  }, []);

  const reset = useCallback(() => {
    retryRef.current = null;
    setState("unblocked");
  }, []);

  useEffect(() => {
    if (!when) {
      retryRef.current = null;
      setState("unblocked");
      return;
    }

    return patchNavigatorForBlocker(
      navigator,
      () => whenRef.current,
      (retry) => {
        retryRef.current = retry;
        setState("blocked");
      },
    );
  }, [when, navigator]);

  return { state, proceed, reset };
}
