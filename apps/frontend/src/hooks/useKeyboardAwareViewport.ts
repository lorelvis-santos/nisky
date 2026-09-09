"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_BREAKPOINT = 1023;
const KEYBOARD_THRESHOLD = 80;
const FOCUS_GAP = 16;

function viewportMetrics(viewport: VisualViewport | null) {
  const height = viewport?.height ?? window.innerHeight;
  const offsetTop = viewport?.offsetTop ?? 0;
  const keyboardHeight = Math.max(0, window.innerHeight - height - offsetTop);
  return { height, offsetTop, keyboardHeight };
}

function scrollFocusedElement(root: HTMLElement, viewport: VisualViewport | null) {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement) || !root.contains(focused)) return;

  const scrollContainer = focused.closest<HTMLElement>("[data-modal-scroll]");
  // Vaul owns the drawer position for inputs in fixed headers and footers.
  if (!scrollContainer && root.dataset.slot === "drawer-content") return;
  const target = scrollContainer ?? root;
  const metrics = viewportMetrics(viewport);
  const rootRect = target.getBoundingClientRect();
  const visibleTop = Math.max(rootRect.top, metrics.offsetTop) + FOCUS_GAP;
  const visibleBottom = Math.min(rootRect.bottom, metrics.offsetTop + metrics.height) - FOCUS_GAP;
  const focusedRect = focused.getBoundingClientRect();

  if (visibleBottom <= visibleTop) return;
  if (focusedRect.bottom > visibleBottom) {
    target.scrollTop += focusedRect.bottom - visibleBottom;
  } else if (focusedRect.top < visibleTop) {
    target.scrollTop -= visibleTop - focusedRect.top;
  }
}

export function useKeyboardAwareViewport<T extends HTMLElement>() {
  const rootRef = useRef<T | null>(null);
  const [rootVersion, setRootVersion] = useState(0);
  const ref = useCallback((node: T | null) => {
    if (rootRef.current === node) return;
    rootRef.current = node;
    if (
      node?.dataset.slot === "dialog-content" ||
      node?.dataset.slot === "drawer-content"
    ) {
      setRootVersion((version) => version + 1);
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const viewport = window.visualViewport ?? null;
    const isDialog = root.dataset.slot === "dialog-content";
    const isDrawer = root.dataset.slot === "drawer-content";
    if (!isDialog && !isDrawer) return;

    const originalMaxHeight = root.style.maxHeight;
    const originalBottom = root.style.bottom;
    const originalTop = root.style.top;
    const originalTransform = root.style.transform;
    let repositioned = false;
    let focusFrame = 0;

    const scheduleFocusScroll = () => {
      if (focusFrame) window.cancelAnimationFrame(focusFrame);
      focusFrame = window.requestAnimationFrame(() => {
        focusFrame = 0;
        scrollFocusedElement(root, viewport);
      });
    };

    const update = () => {
      const metrics = viewportMetrics(viewport);
      const isMobile = window.matchMedia?.(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches ?? window.innerWidth <= MOBILE_BREAKPOINT;
      const keyboardOpen = isMobile
        && metrics.keyboardHeight > KEYBOARD_THRESHOLD
        && root.contains(document.activeElement);

      if (isDialog && keyboardOpen) {
        const computedStyle = window.getComputedStyle(root);
        const isBottomSheet = computedStyle.top === "auto"
          || (root.hasAttribute("data-keyboard-sheet") && computedStyle.left === "auto");
        root.style.maxHeight = `${Math.max(metrics.height - (isBottomSheet ? 8 : 16), 0)}px`;
        root.style.bottom = `${metrics.keyboardHeight + (isBottomSheet ? 0 : 8)}px`;
        if (!isBottomSheet) {
          root.style.top = "auto";
          root.style.transform = "translateX(-50%)";
        }
        repositioned = true;
        scheduleFocusScroll();
      } else if (repositioned) {
        root.style.maxHeight = originalMaxHeight;
        root.style.bottom = originalBottom;
        root.style.top = originalTop;
        root.style.transform = originalTransform;
        repositioned = false;
      } else if (root.contains(document.activeElement)) {
        scheduleFocusScroll();
      }
    };

    update();
    root.addEventListener("focusin", scheduleFocusScroll);
    window.addEventListener("resize", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);

    return () => {
      root.removeEventListener("focusin", scheduleFocusScroll);
      window.removeEventListener("resize", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      if (focusFrame) window.cancelAnimationFrame(focusFrame);
      if (repositioned) {
        root.style.maxHeight = originalMaxHeight;
        root.style.bottom = originalBottom;
        root.style.top = originalTop;
        root.style.transform = originalTransform;
      }
    };
  }, [rootVersion]);

  return ref;
}
