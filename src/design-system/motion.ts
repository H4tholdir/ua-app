// FONTE DI VERITÀ per tutte le animazioni — Claude Code legge da qui, non inventa.
// Aggiornato 2026-05-28 — v2.1 tassonomia 4 categorie + weighting filosofico
// Spec completa: docs/superpowers/specs/2026-05-27-design-system-v2-3.md
// REGOLA ZERO: nessun componente definisce duration/easing inline.
//
// ── WEIGHTING FILOSOFICO per UÀ (app professionale, uso in officina) ──
// Jakub Krehel  50% — ogni animazione deve essere polish-ready per produzione
// Emil Kowalski 40% — frequency gate: >50 tocchi/giorno = zero animazione
// Jhey Tompkins 10% — delighter solo per CONSEGNA success + onboarding
//
// FREQUENCY GATE (Emil): elementi toccati >50x/giorno usano SOLO CSS transition,
// mai Motion JS. Esempi: button tap, toggle, input focus, tab switch.

import { useEffect, useState } from "react";

// ─── TOKEN BASE ──────────────────────────────────────────────────────────────

export const motionTokens = {

  // ─── DURATE (semantiche) ─────────────────────────────────────────────
  duration: {
    instant:     0.08,   // 80ms  — tap feedback, micro toggle (Emil: CSS only)
    fast:        0.14,   // 140ms — icon swap, exit animations
    normal:      0.22,   // 220ms — modal appear, card transition
    slow:        0.36,   // 360ms — page transitions, bottom sheet
    expressive:  0.55,   // 550ms — onboarding step, empty state
    celebration: 0.80,   // 800ms — CONSEGNA success (Jhey: unico momento espressivo)
    skeleton:    1.50,   // 1500ms — skeleton pulse loop (CSS @keyframes, no JS)
  },

  // ─── EASING ──────────────────────────────────────────────────────────
  easing: {
    standard:     [0.2, 0, 0, 1]    as const,  // oggetti che restano a schermo
    emphasized:   [0.16, 1, 0.3, 1] as const,  // momenti espressivi
    enter:        [0, 0, 0.2, 1]    as const,  // elementi che entrano
    exit:         [0.4, 0, 1, 1]    as const,  // elementi che escono
    linear:       [0, 0, 1, 1]      as const,  // loading bar / progress ONLY
    press:        [0.34, 1.56, 0.64, 1] as const, // tap feedback (overshoot lieve)
    ios:          [0.32, 0.72, 0, 1] as const, // iOS native (Vaul/Emil)
    decelerate:   [0, 0, 0.2, 1]    as const,  // alias enter
    accelerate:   [0.4, 0, 1, 1]    as const,  // alias exit
  },

  // ─── SPRING ──────────────────────────────────────────────────────────
  spring: {
    snappy: { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.8 },
    // → tab pill indicator, badge, icon swap

    soft:   { type: "spring" as const, stiffness: 280, damping: 30, mass: 1 },
    // → bottom sheet, modal, drawer

    pop:    { type: "spring" as const, stiffness: 700, damping: 22, mass: 0.7 },
    // → consegna success, conferma positiva

    gentle: { type: "spring" as const, stiffness: 200, damping: 20, mass: 0.8 },
    // → overlay, tooltip

    bounce: { type: "spring" as const, stiffness: 300, damping: 18, mass: 0.8 },
    // → onboarding step (SOLO contesti rari — Jhey lens)
  },

} as const;

// ─── TASSONOMIA 4 CATEGORIE ──────────────────────────────────────────────────
// Usare queste variants direttamente — non reinventare i valori.

// ── CAT 1: MICRO-INTERAZIONI (<150ms) ──
// Emil rule: se toccato >50x/giorno usa CSS transition, non Motion.
// Eccezione: badge count change e icon swap (rari, meritano JS).

export const microVariants = {

  // Tap button (neumorphic): usare whileTap su motion.button
  // La shadow CSS si inverte tramite class toggle — non JS
  buttonTap: {
    tap: {
      scale: 0.97,
      transition: { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.8 },
    },
  },

  // Badge count change: numero pop dal centro
  badgeCount: {
    initial: { y: -8, opacity: 0, scale: 0.8 },
    animate: { y: 0, opacity: 1, scale: 1 },
    exit:    { y: 8, opacity: 0, scale: 0.8 },
    transition: { type: "spring" as const, stiffness: 700, damping: 22, mass: 0.7 },
  },

  // Icon swap: copy → check, edit → save
  iconSwap: {
    initial: { opacity: 0, scale: 0.85, filter: "blur(3px)" },
    animate: { opacity: 1, scale: 1,    filter: "blur(0px)" },
    exit:    { opacity: 0, scale: 0.85, filter: "blur(3px)" },
    transition: { type: "spring" as const, duration: 0.14, bounce: 0 },
  },

} as const;

// ── CAT 2: FEEDBACK (150–300ms) ──
// Jakub rule: exit sempre più sottile dell'enter. Blur come "materializing".

export const feedbackVariants = {

  // Toast / notification (Jakub recipe)
  toast: {
    initial: { opacity: 0, y: 20, filter: "blur(4px)", scale: 0.96 },
    animate: { opacity: 1, y: 0,  filter: "blur(0px)", scale: 1 },
    exit:    { opacity: 0, y: -8, filter: "blur(4px)", scale: 0.97 },
    transition: {
      enter: { type: "spring" as const, duration: 0.28, bounce: 0 },
      exit:  { duration: 0.14, ease: [0.4, 0, 1, 1] as const },
    },
  },

  // Success state: scale pop
  successPop: {
    initial: { scale: 0.85, opacity: 0 },
    animate: { scale: [0.85, 1.08, 1], opacity: 1 },
    transition: { duration: 0.22, ease: [0.34, 1.56, 0.64, 1] as const },
  },

  // Error: shake orizzontale (no bounce — rigidità = corretto per errore)
  errorShake: {
    animate: { x: [0, -8, 8, -6, 6, -3, 3, 0] },
    transition: { duration: 0.25, ease: [0.2, 0, 0, 1] as const },
  },

  // Eliminazione item: scivola a sinistra
  destructiveExit: {
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const },
  },

} as const;

// ── CAT 3: NAVIGAZIONE (250–400ms) ──
// iOS native feel. Page transition con cubic-bezier iOS.
// Bottom sheet: spring soft + drag-to-dismiss (velocity > 300, non distance).

export const navigationVariants = {

  // Page: list → detail (iOS style)
  pageSlide: {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit:    { x: "-30%", opacity: 0.5 },
    transition: { duration: 0.36, ease: [0.32, 0.72, 0, 1] as const },
  },

  // Bottom sheet (spring + drag dismiss)
  bottomSheet: {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit:    { y: "100%", opacity: 0 },
    transition: {
      enter: { type: "spring" as const, stiffness: 280, damping: 30, mass: 1 },
      exit:  { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const },
    },
  },

  // Modal: materializza dal centro (Jakub recipe)
  modal: {
    initial: { opacity: 0, scale: 0.94, y: 8,  filter: "blur(4px)" },
    animate: { opacity: 1, scale: 1,    y: 0,  filter: "blur(0px)" },
    exit:    { opacity: 0, scale: 0.97, y: -4, filter: "blur(4px)" },
    transition: {
      enter: { type: "spring" as const, duration: 0.35, bounce: 0 },
      exit:  { duration: 0.14, ease: [0.4, 0, 1, 1] as const },
    },
  },

  // Tab content: solo fade — no slide (evita confusione direzionale)
  tabContent: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
    transition: { duration: 0.14, ease: [0, 0, 0.2, 1] as const },
  },

  // Overlay / backdrop
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
    transition: {
      enter: { duration: 0.22, ease: [0, 0, 0.2, 1] as const },
      exit:  { duration: 0.14, ease: [0.4, 0, 1, 1] as const },
    },
  },

} as const;

// ── CAT 4: STORYTELLING (400–800ms) ──
// Jhey lens: SOLO per CONSEGNA success e onboarding (eventi rari, alto valore).
// Jakub rule: bounce consentito SOLO qui — mai in Cat 1/2/3.

export const storytellingVariants = {

  // Onboarding step: materializza dall'alto con blur
  onboardingStep: {
    initial: { opacity: 0, y: -24, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0,   filter: "blur(0px)" },
    exit:    { opacity: 0, y: 16,  filter: "blur(4px)" },
    transition: {
      enter: { type: "spring" as const, duration: 0.55, bounce: 0.08 },
      exit:  { duration: 0.22, ease: [0.4, 0, 1, 1] as const },
    },
  },

  // Dashboard KPI: stagger container
  kpiContainer: {
    animate: {
      transition: { staggerChildren: 0.06, delayChildren: 0.10 },
    },
  },

  // KPI card singola (figlio dello stagger)
  kpiCard: {
    initial: { opacity: 0, y: 16, scale: 0.97 },
    animate: { opacity: 1, y: 0,  scale: 1 },
    transition: { type: "spring" as const, duration: 0.45, bounce: 0 },
  },

  // CONSEGNA success — Fase 1: checkmark draw
  consegnaCheckmark: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 0.36, ease: [0, 0, 0.2, 1] as const },
  },

  // CONSEGNA success — Fase 2: ring esplosione (GSAP per confetti)
  consegnaRing: {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: [0.5, 1.2, 1], opacity: [0, 1, 0.8] },
    transition: {
      duration: 0.80,
      times: [0, 0.6, 1],
      ease: [0.34, 1.56, 0.64, 1] as const,
      delay: 0.2,
    },
  },

  // CONSEGNA success — Fase 3: testo "Consegnato!"
  consegnaText: {
    initial: { opacity: 0, y: 16, scale: 0.9, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0,  scale: 1,   filter: "blur(0px)" },
    transition: { type: "spring" as const, duration: 0.5, bounce: 0.12, delay: 0.35 },
  },

} as const;

// ─── LEGACY — backward compatibility ────────────────────────────────────────
/** @deprecated — usare storytellingVariants.consegnaCheckmark */
export const CELEBRATION = {
  popScale: {
    initial: { scale: 0.85, opacity: 0 },
    animate: { scale: [0.85, 1.12, 1], opacity: 1 },
    transition: { duration: motionTokens.duration.expressive, ease: [0.34, 1.56, 0.64, 1] as const },
  },
  checkmark: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.enter },
  },
} as const;

// ─── TIPI DERIVATI ────────────────────────────────────────────────────────────
export type MotionDuration = keyof typeof motionTokens.duration;
export type MotionEasing   = keyof typeof motionTokens.easing;
export type MotionSpring   = keyof typeof motionTokens.spring;

// ─── HELPER per Motion ────────────────────────────────────────────────────────
// Uso: transition={t("fast")} o transition={t("slow", "ios")}
// Mai: transition={{ duration: 0.3, ease: "easeOut" }} — usa i token!
export function t(key: MotionDuration, easing: MotionEasing = "standard") {
  return {
    duration: motionTokens.duration[key],
    ease: motionTokens.easing[easing],
  };
}

// ─── PREFERS-REDUCED-MOTION ───────────────────────────────────────────────────
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

// ─── STAGGER — calcolo sicuro ──────────────────────────────────────────────────
// Mai > 250ms totali, mai > 6 elementi; il resto appare istantaneo.
export function staggerDelay(itemCount: number): number {
  return Math.min(0.05, 0.25 / Math.max(itemCount, 1));
}

// ─── VIEW TRANSITION HELPER ───────────────────────────────────────────────────
export async function viewTransition(callback: () => void | Promise<void>): Promise<void> {
  if (!("startViewTransition" in document)) {
    await callback();
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (document as any).startViewTransition(callback).finished;
}
