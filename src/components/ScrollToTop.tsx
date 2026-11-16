"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Next scrolls a new page so its first non-sticky element sits at the top, which
 * leaves the first ~70px (under the sticky navbar) cut off. Always start a new
 * page at the very top. Same-page filter/search changes keep their position.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.location.hash) return; // let #anchors scroll themselves
    const top = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    top();
    // Next may apply its own small offset a moment later; only correct that offset,
    // never fight a user who has already started scrolling.
    const timers = [60, 200, 500].map((ms) =>
      window.setTimeout(() => {
        if (window.scrollY > 0 && window.scrollY < 150) top();
      }, ms),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [pathname]);
  return null;
}
