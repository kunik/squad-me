import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";

type PublicChromeProps = {
  /**
   * Shared «панель підказки» (hint panel) slot in the App Shell top band.
   * Feeds registration step progress, profile onboarding hints (+ Skip), and
   * later match-reserve status — always via the same chrome, never inside page
   * cards. CSS places a narrow top-attached tab (`--panel-bg`, flush top,
   * rounded bottom) between logo and avatar, with reserved side gutters that
   * shrink when the header uses the icon-only mark (<640px).
   */
  hint?: ReactNode;
};

/**
 * App-shell top chrome: logo header plus optional «панель підказки».
 * Fixed to the viewport (sticky is broken by `.public-surface { overflow:
 * hidden }`); an in-flow spacer mirrors the measured pin height so content
 * is not hidden underneath. Logo + hint + avatar stay visible while the page
 * scrolls.
 */
export function PublicChrome({ hint }: PublicChromeProps) {
  const pinRef = useRef<HTMLDivElement>(null);
  const [spacerHeight, setSpacerHeight] = useState(0);

  useLayoutEffect(() => {
    const el = pinRef.current;
    if (!el) return;

    const sync = () => setSpacerHeight(el.getBoundingClientRect().height);
    sync();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hint]);

  return (
    <>
      <div ref={pinRef} className="app-top-chrome">
        <PublicHeader />
        {hint ? <div className="app-top-chrome__hint">{hint}</div> : null}
      </div>
      <div
        className="app-top-chrome__spacer"
        style={{ height: spacerHeight }}
        aria-hidden="true"
      />
    </>
  );
}
