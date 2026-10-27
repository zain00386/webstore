"use client";

import { useEffect, type RefObject } from "react";

const MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * While `dirty`, asks before the admin leaves the page: reload/close, in-app links (next/link included,
 * since a capture listener on document runs before React's) and submits of other forms (search, sign out).
 * Forms inside `scope` (the form being edited) submit without asking. Browser Back is not caught.
 */
export function useUnsavedChangesGuard(dirty: boolean, scope?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!dirty) return;
    const ask = (e: Event) => {
      if (window.confirm(MESSAGE)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin) return; // a full page load: beforeunload asks
      if (url.hash && url.pathname === location.pathname && url.search === location.search) return; // same-page anchor
      ask(e);
    };
    const onSubmit = (e: SubmitEvent) => {
      if (e.target instanceof Node && scope?.current?.contains(e.target)) return;
      ask(e);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [dirty, scope]);
}
