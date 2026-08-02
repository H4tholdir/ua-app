#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  SALVATAGGIO DEL DATABASE UÀ — copia completa sul computer di Francesco
#
#  🔑 PERCHÉ ESISTE (D137 · D138, 04/08/2026)
#  Il progetto Supabase sta sul piano gratuito, e il piano gratuito NON HA COPIE
#  RIPRISTINABILI: `pitr_enabled:false`, `backups:[]`. La documentazione di
#  Supabase, per chi sta sul gratuito, dice esattamente di fare questo.
#  ⏳ È una RETE PROVVISORIA: prima della distribuzione si prende il piano a
#  pagamento (D138), che tiene le copie giornaliere degli ultimi 7 giorni.
#
#  🛑 DENTRO C'È TUTTO IL DATABASE, PASSWORD DEGLI UTENTI COMPRESE. Oggi sono
#  solo dati di prova (ua-app/CLAUDE.md §8). Dal primo laboratorio VERO questi
#  file conterranno nomi di pazienti e anamnesi: da quel giorno il disco su cui
#  stanno va cifrato (su Mac: FileVault) e la cartella non va messa in nessun
#  servizio di sincronizzazione che esca dall'Unione europea.
#
#  🔑 PERCHÉ I PEZZI SONO CINQUE E NON TRE — misurato provando il ripristino
#  in un database usa-e-getta il 04/08/2026. Il salvataggio «normale» di
#  Supabase copre SOLO lo schema `public`: rimettendolo su, i dati tornavano
#  tutti (295 lavori · 39 clienti · 2 contratti · 1588 righe di registro · 104
#  funzioni) MA lo schema `auth` non c'era — cioè **i dati tornavano e nessuno
#  poteva entrare** — e non c'era `storage`, cioè l'anagrafe dei file.
#  🛑 E i FILE veri (contratti in PDF, foto cliniche) non stanno nel database:
#  si scaricano a parte, con `scripts/salvataggio-archivio.ts`.
#
#  USO:  bash scripts/salvataggio-database.sh
#  ESITO: in ~/Backup-UA-database/<data-e-ora>/
#         ruoli.sql · struttura.sql · dati.sql            ← l'applicazione
#         struttura-piattaforma.sql · dati-piattaforma.sql ← utenti e archivio
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

QUI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINAZIONE="${HOME}/Backup-UA-database"
STAMPO="$(date +%Y-%m-%d_%H%M%S)"
CARTELLA="${DESTINAZIONE}/${STAMPO}"

if [ ! -f "${QUI}/.env.local" ]; then
  echo "🛑 Non trovo .env.local in ${QUI}" >&2
  exit 1
fi

# La riga si legge senza mai stamparla: dentro c'è la password del database.
DB_URL="$(grep '^SUPABASE_DB_URL=' "${QUI}/.env.local" | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [ -z "${DB_URL}" ]; then
  echo "🛑 SUPABASE_DB_URL non valorizzata in .env.local" >&2
  exit 1
fi

mkdir -p "${CARTELLA}"
# la cartella è leggibile solo dal proprietario: dentro ci finiranno dati veri
chmod 700 "${DESTINAZIONE}" "${CARTELLA}"

echo "→ salvo in ${CARTELLA}"

# ① I RUOLI — chi può fare cosa nel database. Senza, la struttura non si applica.
echo "  ① ruoli…"
npx --yes supabase db dump --db-url "${DB_URL}" -f "${CARTELLA}/ruoli.sql" --role-only

# ② LA STRUTTURA — tabelle, funzioni, regole di accesso, automatismi.
#    🔑 È il pezzo che vale di più: 104 funzioni, 125 regole, 73 automatismi.
echo "  ② struttura…"
npx --yes supabase db dump --db-url "${DB_URL}" -f "${CARTELLA}/struttura.sql"

# ③ I DATI. `--use-copy` è il formato che si ricarica più in fretta.
echo "  ③ dati…"
npx --yes supabase db dump --db-url "${DB_URL}" -f "${CARTELLA}/dati.sql" --data-only --use-copy

# ④ LA PIATTAFORMA — gli UTENTI (`auth`) e l'anagrafe dei file (`storage`).
#    🔑 Senza questo il ripristino dà un database pieno in cui NESSUNO ENTRA.
#    ⚠️ Dentro ci sono le password (in forma cifrata) di tutti gli utenti.
echo "  ④ struttura di utenti e archivio…"
npx --yes supabase db dump --db-url "${DB_URL}" --schema auth,storage -f "${CARTELLA}/struttura-piattaforma.sql"
echo "  ⑤ dati di utenti e archivio…"
npx --yes supabase db dump --db-url "${DB_URL}" --schema auth,storage --data-only --use-copy -f "${CARTELLA}/dati-piattaforma.sql"

# ── Controllo che i file abbiano davvero dentro qualcosa ────────────────────
#    🛑 Un salvataggio che non si controlla non è un salvataggio: è un file.
ESITO=0
for F in ruoli struttura dati struttura-piattaforma dati-piattaforma; do
  P="${CARTELLA}/${F}.sql"
  if [ ! -s "${P}" ]; then
    echo "  🛑 ${F}.sql è VUOTO" >&2
    ESITO=1
  else
    RIGHE=$(wc -l < "${P}" | tr -d ' ')
    PESO=$(du -h "${P}" | cut -f1)
    echo "  ✅ ${F}.sql — ${RIGHE} righe, ${PESO}"
  fi
done

# la struttura deve contenere le cose che sappiamo esserci: se mancano, il
# salvataggio è riuscito a metà e va saputo ADESSO, non il giorno del ripristino.
if ! grep -q "CREATE POLICY" "${CARTELLA}/struttura.sql" 2>/dev/null; then
  echo "  🛑 nella struttura NON ci sono le regole di accesso (CREATE POLICY)" >&2
  ESITO=1
fi
if ! grep -q "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" "${CARTELLA}/struttura.sql" 2>/dev/null; then
  echo "  🛑 nella struttura NON ci sono le funzioni" >&2
  ESITO=1
fi

# gli utenti devono esserci DAVVERO: è il pezzo che il primo giro non aveva
UTENTI=$(grep -c "^COPY \"\?auth\"\?\.\"\?users\|^COPY users" "${CARTELLA}/dati-piattaforma.sql" 2>/dev/null || true)
if [ "${UTENTI:-0}" -eq 0 ]; then
  echo "  ⚠️  non trovo il blocco degli UTENTI in dati-piattaforma.sql — controllare a mano" >&2
fi

if [ "${ESITO}" -ne 0 ]; then
  echo "🛑 SALVATAGGIO INCOMPLETO — non fidarsene." >&2
  exit 1
fi

# ⑥ I FILE VERI — contratti in PDF e foto cliniche. Non stanno nel database.
echo "  ⑥ archivio dei file…"
npx --yes tsx "${QUI}/scripts/salvataggio-archivio.ts" "${CARTELLA}/archivio"

# 🛑 I file li può leggere SOLO il proprietario: dal primo laboratorio vero
#    qui dentro ci sono nomi di pazienti, anamnesi e password cifrate.
chmod -R go-rwx "${CARTELLA}"
find "${CARTELLA}" -type f -exec chmod 600 {} +

echo "✅ salvataggio completo in ${CARTELLA}"
du -sh "${CARTELLA}"
ls -la "${CARTELLA}"

cat <<'NOTA'

── COME SI RIPRISTINA ──────────────────────────────────────────────────────
  Su un database vuoto, in QUEST'ORDINE:
    1) ruoli.sql
    2) struttura.sql              (l'applicazione)
    3) struttura-piattaforma.sql  (utenti e archivio)
    4) dati.sql                   ← con `SET session_replication_role = replica;`
    5) dati-piattaforma.sql       ← idem
    6) i file di archivio/ si ricaricano nei contenitori usando inventario.json

  🔑 Il punto 4 vuole i controlli sospesi perché `fatture` e `pagamenti` hanno
     vincoli CIRCOLARI: senza, il ripristino si blocca. Misurato, non temuto.
  ⚠️ Nella prova del 04/08 (contenitore usa-e-getta) 11 regole di accesso su 115
     non si sono applicate: quasi certamente perché in un PostgreSQL nudo NON
     esistono i ruoli `anon`/`authenticated` che quelle regole nominano, e su un
     progetto Supabase vero ci sono. NON VERIFICATO — da controllare il giorno
     di un ripristino vero, contando le regole alla fine.
────────────────────────────────────────────────────────────────────────────
NOTA
