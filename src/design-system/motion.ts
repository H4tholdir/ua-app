// FONTE DI VERITÀ per tutte le animazioni — Claude Code legge da qui, non inventa.
// Aggiornato 2026-05-12. Vedi docs: 29_motion_system_policy.md
// REGOLA ZERO: nessun componente definisce duration/easing inline.

import { useEffect, useState } from "react";

export const motionTokens = {

  // ─── DURATE (semantiche, non arbitrarie) ────────────────────────────
  duration: {
    instant:     0.08,   // 80ms  — tap feedback, stato toggles
    fast:        0.14,   // 140ms — hover, small state changes
    normal:      0.22,   // 220ms — modal appear, card transition
    slow:        0.36,   // 360ms — page transitions, drawer open
    expressive:  0.55,   // 550ms — celebrazioni, onboarding reveal
    celebration: 0.80,   // 800ms — CONSEGNA success, confetti timing
    skeleton:    1.50,   // 1500ms — skeleton pulse loop (repeat: Infinity)
  },

  // ─── EASING (con significato specifico) ─────────────────────────────
  easing: {
    standard:   [0.2, 0, 0, 1],       // Objects that stay on screen
    emphasized: [0.16, 1, 0.3, 1],    // Expressive, emphasized moments
    enter:      [0, 0, 0.2, 1],       // Elements entering the screen
    exit:       [0.4, 0, 1, 1],       // Elements leaving the screen
    linear:     [0, 0, 1, 1],         // Loading bars, progress only
  },

  // ─── SPRING (fisica naturale per interazioni touch) ──────────────────
  spring: {
    snappy: { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.8 },
    // → tap feedback, bottoni, card hover

    soft:   { type: "spring" as const, stiffness: 280, damping: 30, mass: 1 },
    // → bottom sheet, modal, drawer

    pop:    { type: "spring" as const, stiffness: 700, damping: 22, mass: 0.7 },
    // → successo, conferma positiva, badge appear

    gentle: { type: "spring" as const, stiffness: 200, damping: 20, mass: 0.8 },
    // → overlay, pannelli laterali, tooltip
  },

} as const;

// ─── TIPI DERIVATI ──────────────────────────────────────────────────────
export type MotionDuration = keyof typeof motionTokens.duration;
export type MotionEasing   = keyof typeof motionTokens.easing;
export type MotionSpring   = keyof typeof motionTokens.spring;

// ─── HELPER per Motion ──────────────────────────────────────────────────
// Uso: transition={t("fast")} o transition={t("slow", "emphasized")}
// Mai: transition={{ duration: 0.3, ease: "easeOut" }} — usa i token!
export function t(key: MotionDuration, easing: MotionEasing = "standard") {
  return {
    duration: motionTokens.duration[key],
    ease: motionTokens.easing[easing],
  };
}

// ─── PREFERS-REDUCED-MOTION ─────────────────────────────────────────────
// Ogni componente con animazioni non-istantanee DEVE usare questo hook.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// ─── STAGGER — calcolo sicuro ────────────────────────────────────────────
// Mai > 250ms totali, mai > 6 elementi animati; il resto appare istantaneo.
export function staggerDelay(itemCount: number): number {
  return Math.min(0.05, 0.25 / Math.max(itemCount, 1));
}

// ─── VIEW TRANSITION HELPER ──────────────────────────────────────────────
// Usa sempre questo wrapper — mai document.startViewTransition direttamente.
export async function viewTransition(callback: () => void | Promise<void>): Promise<void> {
  if (!("startViewTransition" in document)) {
    await callback();
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (document as any).startViewTransition(callback).finished;
}
