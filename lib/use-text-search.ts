"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type CSSWithHighlights = typeof CSS & {
  highlights?: { set: (name: string, h: unknown) => void; delete: (name: string) => void };
};

/**
 * Find all (case-insensitive) occurrences of `query` inside `containerRef`'s
 * subtree and paint them with the CSS Custom Highlight API. Tracks an
 * "active" match the user can step through with prev / next.
 *
 * Falls back to a no-op when the browser doesn't expose the Highlight API
 * (matches[] is still computed so the counter works).
 */
export function useTextSearch(
  containerRef: RefObject<HTMLElement | null>,
  query: string
) {
  const [matches, setMatches] = useState<Range[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const queryRef = useRef(query);
  queryRef.current = query;

  const recompute = useCallback(() => {
    const root = containerRef.current;
    const q = queryRef.current.trim();
    const css = (typeof CSS !== "undefined" ? CSS : null) as
      | CSSWithHighlights
      | null;

    if (!root || q.length < 1) {
      setMatches([]);
      setActiveIdx(0);
      css?.highlights?.delete("search");
      css?.highlights?.delete("search-active");
      return;
    }

    const ranges: Range[] = [];
    const lower = q.toLowerCase();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();
    while (node) {
      const text = node.nodeValue ?? "";
      const lowerText = text.toLowerCase();
      let from = 0;
      while (from < lowerText.length) {
        const idx = lowerText.indexOf(lower, from);
        if (idx < 0) break;
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + q.length);
        ranges.push(range);
        from = idx + q.length;
      }
      node = walker.nextNode();
    }

    setMatches(ranges);
    setActiveIdx((prev) => (prev >= ranges.length ? 0 : prev));

    if (css?.highlights && typeof window !== "undefined") {
      const HighlightCtor = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
      if (HighlightCtor) {
        if (ranges.length === 0) {
          css.highlights.delete("search");
          css.highlights.delete("search-active");
        } else {
          css.highlights.set("search", new HighlightCtor(...ranges));
        }
      }
    }
  }, [containerRef]);

  // Re-run when the query changes; also re-walk on small DOM mutations
  // (e.g. streaming text) via MutationObserver.
  useEffect(() => {
    recompute();
  }, [query, recompute]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const obs = new MutationObserver(() => {
      recompute();
    });
    obs.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => obs.disconnect();
  }, [containerRef, recompute]);

  // Apply the "active" highlight + scroll into view whenever the cursor moves.
  useEffect(() => {
    const css = (typeof CSS !== "undefined" ? CSS : null) as
      | CSSWithHighlights
      | null;
    if (!css?.highlights || typeof window === "undefined") return;
    const HighlightCtor = (
      window as unknown as { Highlight?: new (...r: Range[]) => unknown }
    ).Highlight;
    if (!HighlightCtor) return;

    if (matches.length === 0) {
      css.highlights.delete("search-active");
      return;
    }
    const safeIdx = activeIdx % matches.length;
    const range = matches[safeIdx];
    css.highlights.set("search-active", new HighlightCtor(range));

    const target = (range.startContainer.parentElement ??
      range.commonAncestorContainer) as HTMLElement | null;
    target?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [matches, activeIdx]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      const css = (typeof CSS !== "undefined" ? CSS : null) as
        | CSSWithHighlights
        | null;
      css?.highlights?.delete("search");
      css?.highlights?.delete("search-active");
    };
  }, []);

  const next = useCallback(() => {
    setActiveIdx((i) => (matches.length === 0 ? 0 : (i + 1) % matches.length));
  }, [matches.length]);

  const prev = useCallback(() => {
    setActiveIdx((i) =>
      matches.length === 0 ? 0 : (i - 1 + matches.length) % matches.length
    );
  }, [matches.length]);

  return {
    matches,
    activeIdx,
    next,
    prev,
    supported:
      typeof window !== "undefined" &&
      "Highlight" in window &&
      "highlights" in CSS,
  };
}
