"use client";

import { useEffect, useRef } from "react";
import {
  computeMagnetOffset,
  CURSOR_RING_HOVER_SCALE,
  isMarketingCursorEffectsEnabled,
  MARKETING_CURSOR_SECTION_SELECTOR,
  MARKETING_MAGNET_SELECTOR,
} from "@/lib/marketing/magnetic";

const INTERACTIVE_SELECTOR =
  "a, button, [data-magnet], input, select, textarea, [role='button']";

/**
 * Marketing-only pointer follower and magnetic CTA controller.
 *
 * Updates CSS custom properties on the document root and magnet targets inside
 * marketing sections — no React state is used during pointer tracking so scroll
 * and hover stay off the render path.
 *
 * Disabled on touch (`pointer: coarse`) and `prefers-reduced-motion: reduce`.
 */
export function MarketingCursorFollower() {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");

    const readEnabled = () =>
      isMarketingCursorEffectsEnabled(
        reducedMotionQuery.matches,
        coarsePointerQuery.matches
      );

    if (!readEnabled()) {
      return;
    }

    const ring = ringRef.current;
    if (!ring) {
      return;
    }

    const root = document.documentElement;
    let magnets: HTMLElement[] = [];
    let pointerActive = false;
    let pointerX = 0;
    let pointerY = 0;
    let ringScale = 1;
    let paused = false;
    let rafId = 0;

    const cacheMagnets = () => {
      magnets = Array.from(
        document.querySelectorAll<HTMLElement>(
          `${MARKETING_CURSOR_SECTION_SELECTOR} ${MARKETING_MAGNET_SELECTOR}`
        )
      );
    };

    const resetMagnets = () => {
      for (const magnet of magnets) {
        magnet.style.setProperty("--magnet-x", "0px");
        magnet.style.setProperty("--magnet-y", "0px");
      }
    };

    const hideFollower = () => {
      ring.style.opacity = "0";
      root.style.setProperty("--cursor-scale", "1");
      resetMagnets();
    };

    const showFollower = () => {
      ring.style.opacity = "1";
    };

    const applyFrame = () => {
      if (!pointerActive || paused) {
        return;
      }

      root.style.setProperty("--cursor-x", `${pointerX}px`);
      root.style.setProperty("--cursor-y", `${pointerY}px`);
      root.style.setProperty("--cursor-scale", String(ringScale));

      for (const magnet of magnets) {
        const offset = computeMagnetOffset(
          pointerX,
          pointerY,
          magnet.getBoundingClientRect()
        );
        magnet.style.setProperty("--magnet-x", `${offset.x}px`);
        magnet.style.setProperty("--magnet-y", `${offset.y}px`);
      }
    };

    const tick = () => {
      applyFrame();
      rafId = window.requestAnimationFrame(tick);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !readEnabled()) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const section = target.closest(MARKETING_CURSOR_SECTION_SELECTOR);
      if (!section) {
        pointerActive = false;
        hideFollower();
        return;
      }

      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerActive = true;

      const interactive = target.closest(INTERACTIVE_SELECTOR);
      ringScale = interactive ? CURSOR_RING_HOVER_SCALE : 1;
      showFollower();
    };

    const handlePointerLeave = () => {
      pointerActive = false;
      hideFollower();
    };

    const pauseEffects = () => {
      paused = true;
      pointerActive = false;
      hideFollower();
    };

    const resumeEffects = () => {
      paused = document.pointerLockElement !== null;
      if (paused) {
        hideFollower();
      }
    };

    const handleMediaChange = () => {
      if (!readEnabled()) {
        pauseEffects();
        teardown();
        return;
      }
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement) {
        pauseEffects();
        return;
      }
      resumeEffects();
    };

    cacheMagnets();
    rafId = window.requestAnimationFrame(tick);

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("blur", pauseEffects);
    window.addEventListener("focus", resumeEffects);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pauseEffects();
      } else {
        resumeEffects();
      }
    });
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    window.addEventListener("resize", cacheMagnets);
    reducedMotionQuery.addEventListener("change", handleMediaChange);
    coarsePointerQuery.addEventListener("change", handleMediaChange);

    function teardown() {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("blur", pauseEffects);
      window.removeEventListener("focus", resumeEffects);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      window.removeEventListener("resize", cacheMagnets);
      reducedMotionQuery.removeEventListener("change", handleMediaChange);
      coarsePointerQuery.removeEventListener("change", handleMediaChange);
      hideFollower();
    }

    return teardown;
  }, []);

  return (
    <div
      ref={ringRef}
      className="marketing-cursor-follower"
      aria-hidden="true"
      data-testid="marketing-cursor-follower"
    />
  );
}
