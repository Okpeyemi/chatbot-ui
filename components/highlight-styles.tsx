"use client";

import { useEffect } from "react";

/**
 * Injects the ::highlight() rules used by the in-conversation search
 * (CSS Custom Highlight API) at runtime, because Lightning CSS / PostCSS
 * doesn't recognise the pseudo-element at build time.
 *
 * Browsers that don't support the API simply ignore the rules.
 */
const HIGHLIGHT_CSS = [
  "::highlight(search){background-color:rgba(255,224,102,0.35);color:inherit}",
  "::highlight(search-active){background-color:var(--accent-brand);color:var(--primary-foreground)}",
].join("");

const STYLE_ID = "chatbot-ui-highlight-styles";

export function HighlightStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = HIGHLIGHT_CSS;
    document.head.append(style);
  }, []);
  return null;
}
