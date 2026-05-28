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

# ── Report ──────────────────────────────────────────────────────────────────
if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "⛔ $ERRORS violazione/i DS v2.3 trovate. Commit bloccato."
  echo "   Spec: docs/superpowers/specs/2026-05-27-design-system-v2-3.md"
  exit 1
fi

echo "✅ DS v2.3 compliance OK"
