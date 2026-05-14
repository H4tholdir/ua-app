#!/bin/bash
# Verifica che tutte le API routes con metodi mutanti abbiano il check isSameOrigin.
# NOTA: api/stripe/webhook e' esclusa deliberatamente — usa HMAC Stripe (stripe-signature),
# non cookie-based auth, quindi isSameOrigin non si applica.

SKIP_LIST=(
  "src/app/api/stripe/webhook/route.ts"
)

echo "=== API Routes senza CSRF check ==="
MISSING=0

for file in $(find src/app/api -name "route.ts" | sort); do
  # Salta file nella lista di esclusione
  SKIP=false
  for skip in "${SKIP_LIST[@]}"; do
    if [[ "$file" == *"$skip"* ]]; then
      SKIP=true
      break
    fi
  done
  if $SKIP; then
    continue
  fi

  if grep -q "POST\|PATCH\|PUT\|DELETE" "$file"; then
    if ! grep -q "isSameOrigin" "$file"; then
      echo "MISSING CSRF: $file"
      MISSING=$((MISSING + 1))
    fi
  fi
done

if [ $MISSING -eq 0 ]; then
  echo "OK — tutte le routes mutanti hanno isSameOrigin"
fi
echo "=== Done ==="
