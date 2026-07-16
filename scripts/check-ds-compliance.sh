#!/usr/bin/env bash
# DS v2.3 Compliance Guard — eseguito da pre-commit
# Blocca commit con violazioni critiche del design system
set -e

SCOPE="src/app/(app) src/app/billing src/components"
ERRORS=0

# ── 1. Gold come testo (WCAG fail) ──────────────────────────────────────────
GOLD_TEXT=$(grep -rn "color:.*var(--gold\|color:.*#D4A843\|color:.*#d4a843" \
  $SCOPE --include="*.tsx" --include="*.ts" 2>/dev/null \
  | grep -v "background\|stroke\|border\|accentColor\|fill\|\.css\|tokens\.ts" \
  | grep -v "node_modules" || true)

if [ -n "$GOLD_TEXT" ]; then
  echo ""
  echo "❌ DS v2.3: gold usato come testo (WCAG fail 1.6:1)"
  echo "   Usa var(--c-amber, #F59E0B) per testo warning, non --gold"
  echo "$GOLD_TEXT"
  ERRORS=$((ERRORS + 1))
fi

# ── 2. Vecchi t2/t3 fallback ────────────────────────────────────────────────
OLD_T2=$(grep -rn "#96918D\|#B8B3AE" \
  $SCOPE --include="*.tsx" --include="*.ts" 2>/dev/null \
  | grep -v "tokens\.ts\|era #\|node_modules" || true)

if [ -n "$OLD_T2" ]; then
  echo ""
  echo "❌ DS v2.3: vecchi fallback t2/t3 (#96918D o #B8B3AE)"
  echo "   Usa #4A3D33 (t2) e #6B5C51 (t3)"
  echo "$OLD_T2"
  ERRORS=$((ERRORS + 1))
fi

# ── 3. Shadow hardcoded (dark mode broken) ─────────────────────────────────
HARD_SHADOW=$(grep -rn "shB:.*rgba\|shC:.*rgba\|shI:.*rgba" \
  $SCOPE --include="*.tsx" --include="*.ts" 2>/dev/null \
  | grep -v "node_modules" || true)

if [ -n "$HARD_SHADOW" ]; then
  echo ""
  echo "❌ DS v2.3: shadow hardcoded in DS object — dark mode non funzionerà"
  echo "   Usa shB: 'var(--sh-b)', shC: 'var(--sh-c)', shI: 'var(--sh-i)'"
  echo "$HARD_SHADOW"
  ERRORS=$((ERRORS + 1))
fi

# ── 4. DS v3: scope src/components/ds + src/design-system/v3 ────────────────
V3_SCOPE="src/components/ds src/design-system/v3"
V3_EXISTS=$(ls -d src/components/ds src/design-system/v3 2>/dev/null || true)

if [ -n "$V3_EXISTS" ]; then
  # 4a. Colori inline nei componenti v3 (tokens.ts è l'unica eccezione)
  V3_HEX=$(grep -rn "#[0-9A-Fa-f]\{6\}\b\|rgba\?(" $V3_SCOPE \
    --include="*.tsx" --include="*.ts" 2>/dev/null \
    | grep -v "v3/tokens\.ts\|node_modules\|\.test\." || true)
  if [ -n "$V3_HEX" ]; then
    echo ""
    echo "❌ DS v3: colore inline fuori da v3/tokens.ts (spec §3, §13.2)"
    echo "$V3_HEX"
    ERRORS=$((ERRORS + 1))
  fi

  # 4b. Durate/easing inline nei componenti v3 (motion.ts è l'unica eccezione)
  V3_MOTION=$(grep -rn "duration:\s*[0-9]\|ease:\s*\[" src/components/ds \
    --include="*.tsx" --include="*.ts" 2>/dev/null \
    | grep -v "node_modules\|\.test\." || true)
  if [ -n "$V3_MOTION" ]; then
    echo ""
    echo "❌ DS v3: durata/easing inline — usa le molle di v3/motion.ts (spec §8)"
    echo "$V3_MOTION"
    ERRORS=$((ERRORS + 1))
  fi

  # 4c. Font vietati nel perimetro v3
  # "Inter" richiede confine di parola (\b): senza, la sottostringa matcha parole
  # italiane come "Interattiva"/"interno"/"interruttore" (falsi positivi).
  V3_FONT=$(grep -rn "DM Sans\|Playfair\|\bInter\b\|Roboto" $V3_SCOPE \
    --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null \
    | grep -v "node_modules\|\.test\." || true)
  if [ -n "$V3_FONT" ]; then
    echo ""
    echo "❌ DS v3: font vietato nel perimetro v3 — solo Plus Jakarta Sans (spec §4.1)"
    echo "$V3_FONT"
    ERRORS=$((ERRORS + 1))
  fi

  # 4d. Parole del software nella UI v3 (dizionario §2.3 — jsx text)
  V3_PAROLE=$(grep -rniE ">(.*\b(dashboard|submit|record|loading)\b.*)<" src/components/ds \
    --include="*.tsx" 2>/dev/null | grep -v "node_modules\|\.test\." || true)
  if [ -n "$V3_PAROLE" ]; then
    echo ""
    echo "❌ DS v3: parola del software nella UI — usa il dizionario (v3/dizionario.ts)"
    echo "$V3_PAROLE"
    ERRORS=$((ERRORS + 1))
  fi
fi

# ── 5. CSS globali (globals.css + ds-v3.css) — ondata 16/07 ────────────────
CSS_GLOBALI="src/app/globals.css src/app/ds-v3.css"

# 5a. Gold come testo nei CSS (la DEFINIZIONE --gold:… in globals è legittima).
# `(^|[^-])color:` = match chirurgico: esclude border-color/background-color/…
# senza scartare la riga intera (una riga può avere più dichiarazioni).
CSS_GOLD=$(grep -nE "(^|[^-])color:\s*var\(--gold\)|(^|[^-])color:\s*#[Dd]4[Aa]843" $CSS_GLOBALI 2>/dev/null || true)
if [ -n "$CSS_GOLD" ]; then
  echo ""
  echo "❌ CSS globali: gold usato come testo (WCAG fail 1.6:1)"
  echo "$CSS_GOLD"
  ERRORS=$((ERRORS + 1))
fi

# 5b. Vecchi fallback t2/t3 nei CSS
CSS_T2=$(grep -n "#96918D\|#B8B3AE" $CSS_GLOBALI 2>/dev/null \
  | grep -v "era #" || true)
if [ -n "$CSS_T2" ]; then
  echo ""
  echo "❌ CSS globali: vecchi fallback t2/t3 (#96918D o #B8B3AE)"
  echo "$CSS_T2"
  ERRORS=$((ERRORS + 1))
fi

# 5c. Font fuori allowlist. Allowlist: DM Sans + Playfair (legacy v2.3, import
# storico riga 1 di globals.css) e Plus Jakarta Sans (v3, self-hosted).
# Un nuovo import Google Fonts o un font vietato (Inter/Roboto) → FAIL.
CSS_FONT=$(grep -nE "\bInter\b|Roboto" $CSS_GLOBALI 2>/dev/null || true)
if [ -n "$CSS_FONT" ]; then
  echo ""
  echo "❌ CSS globali: font vietato (Inter/Roboto)"
  echo "$CSS_FONT"
  ERRORS=$((ERRORS + 1))
fi
CSS_GFONTS=$(grep -n "fonts.googleapis" $CSS_GLOBALI 2>/dev/null \
  | grep -v "DM+Sans\|Playfair" || true)
if [ -n "$CSS_GFONTS" ]; then
  echo ""
  echo "❌ CSS globali: import Google Fonts fuori allowlist (solo DM Sans+Playfair legacy)"
  echo "$CSS_GFONTS"
  ERRORS=$((ERRORS + 1))
fi

# 5d. Anti-leak: i token v3 --sh-card/--sh-press/--font-v3 si DEFINISCONO solo
# in ds-v3.css (i --sh-b/--sh-c/--sh-i v2.3 in globals.css sono legittimi).
V3_LEAK=$(grep -nE -- "--sh-card\s*:|--sh-press\s*:|--font-v3\s*:" src/app/globals.css 2>/dev/null || true)
if [ -n "$V3_LEAK" ]; then
  echo ""
  echo "❌ globals.css: token v3 definito fuori da ds-v3.css (anti-leak)"
  echo "$V3_LEAK"
  ERRORS=$((ERRORS + 1))
fi

# ── Report ──────────────────────────────────────────────────────────────────
if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "⛔ $ERRORS violazione/i DS trovate. Commit bloccato."
  echo "   Spec v2.3: docs/superpowers/specs/2026-05-27-design-system-v2-3.md"
  echo "   Spec v3:   docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md"
  exit 1
fi

echo "✅ DS compliance OK (v2.3 legacy + v3)"
