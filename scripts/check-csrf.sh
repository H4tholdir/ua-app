#!/bin/bash
# Guardia CSRF — ogni route che MUTA dati deve verificare che la richiesta arrivi dalla nostra
# origine (`isSameOrigin`). Senza, un sito ostile può far partire la richiesta dal browser di un
# utente già autenticato: il cookie di sessione parte da solo, e l'azione va a buon fine.
#
# USO:  bash scripts/check-csrf.sh
#   uscita 0 = nessuna route scoperta · 1 = almeno una route scoperta (o una lista disallineata)
# Costa ~0,3 s: è pensata per girare a ogni commit.
#
# ── STORIA (perché questo file è stato riscritto il 28/07/2026) ────────────────────────────────
# Fino al 28/07 questa guardia (a) non era agganciata a NULLA — nessuno la eseguiva mai — e
# (b) **non poteva diventare rossa**: stampava «MISSING CSRF» e poi usciva 0 lo stesso. Cioè
# segnalava e assolveva nello stesso respiro. Inoltre cercava le parole POST/PATCH/PUT/DELETE
# **ovunque nel file, commenti compresi**, e questo produceva falsi positivi:
#   · `api/fatture/[id]/route.ts` è un file `export {}` — una lapide con dei commenti sopra che
#     nominano il PATCH rimosso: nessun handler, nessuna superficie da proteggere;
#   · `api/lavori/[id]/precheck-consegna/route.ts` espone solo GET, e la parola POST compare nei
#     commenti che spiegano la parità con la consegna.
# Ora si cercano gli **handler esportati davvero**, non le parole.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

# ── Esclusioni LEGITTIME: ognuna con la ragione, e la ragione è un fatto verificabile. ──────────
# Regola: si entra qui solo se la route è immune per COSTRUZIONE, non per comodità.
declare -a SKIP_LIST=(
  # HMAC di Stripe nell'header `stripe-signature`: non è autenticazione via cookie, quindi non
  # esiste la classe di attacco che isSameOrigin previene.
  "src/app/api/stripe/webhook/route.ts"
  # Parola d'ordine interna nell'header `x-internal-secret` (riga 19). Un header personalizzato
  # NON è impostabile da un form cross-site: la richiesta ostile non parte proprio.
  "src/app/api/internal/pec-verify/route.ts"
  # Superficie PUBBLICA per progetto (v. intestazione del file): nessuna sessione da cavalcare,
  # l'autorizzazione è il `portale_token` del cliente, non il cookie dell'utente.
  "src/app/api/portale/richiedi/route.ts"
)

# ── Sospese: NON sono assolte, e non fanno fallire il commit finché la decisione non c'è. ───────
# Compaiono a ogni esecuzione, apposta: una domanda aperta deve restare visibile.
declare -a DA_DECIDERE=(
  "src/app/api/auth/webauthn/login/options/route.ts"
  "src/app/api/auth/webauthn/login/verify/route.ts"
)
MOTIVO_SOSPESE="cerimonia di accesso con impronta/volto, PRIMA che esista una sessione.
     Se una verifica di origine sia il controllo giusto qui — e se sia compatibile con la
     cerimonia WebAuthn — è una decisione di sicurezza da prendere con un panel, non da
     sbrigare in un commit. Aperta il 28/07/2026."

in_lista() {
  local ago="$1"; shift
  local paglia
  for paglia in "$@"; do [[ "$ago" == "$paglia" ]] && return 0; done
  return 1
}

echo "=== Guardia CSRF — route mutanti senza isSameOrigin ==="
SCOPERTE=0
FANTASMI=0

while IFS= read -r file; do
  # Handler DAVVERO esportati, non la parola scritta in un commento.
  if ! grep -qE '^[[:space:]]*export[[:space:]]+(async[[:space:]]+)?function[[:space:]]+(POST|PATCH|PUT|DELETE)\b|^[[:space:]]*export[[:space:]]+const[[:space:]]+(POST|PATCH|PUT|DELETE)[[:space:]]*=' "$file"; then
    continue
  fi

  if in_lista "$file" "${SKIP_LIST[@]}"; then continue; fi

  if in_lista "$file" "${DA_DECIDERE[@]}"; then
    if ! grep -q "isSameOrigin" "$file"; then
      echo "⏸️  SOSPESA (non blocca): $file"
    fi
    continue
  fi

  if ! grep -q "isSameOrigin" "$file"; then
    echo "❌ SCOPERTA: $file — route mutante senza isSameOrigin"
    SCOPERTE=$((SCOPERTE + 1))
  fi
done < <(find src/app/api -name "route.ts" | sort)

# Una lista di esclusione che nomina file inesistenti è una lista che nessuno rilegge: si accorge
# da sola di essere invecchiata, invece di proteggere in silenzio un percorso che non c'è più.
for atteso in "${SKIP_LIST[@]}" "${DA_DECIDERE[@]}"; do
  if [ ! -f "$atteso" ]; then
    echo "⚠️  LISTA DISALLINEATA: $atteso non esiste più — l'esclusione va tolta o corretta"
    FANTASMI=$((FANTASMI + 1))
  fi
done

if [ ${#DA_DECIDERE[@]} -gt 0 ]; then
  echo ""
  echo "   ⏸️  ${#DA_DECIDERE[@]} route sospese in attesa di decisione:"
  echo "     $MOTIVO_SOSPESE"
fi

echo ""
if [ $SCOPERTE -gt 0 ] || [ $FANTASMI -gt 0 ]; then
  echo "❌ GUARDIA CSRF ROSSA — $SCOPERTE route scoperte, $FANTASMI esclusioni fantasma"
  exit 1
fi
echo "✅ Guardia CSRF verde — ogni route mutante verifica l'origine, o è esclusa con una ragione scritta"
exit 0
