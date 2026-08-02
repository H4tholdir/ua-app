#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  SALVATAGGIO PROGRAMMATO — l'involucro che fa partire il salvataggio DA SOLO
#
#  🔑 PERCHÉ ESISTE (D139, 04/08/2026)
#  `scripts/salvataggio-database.sh` funziona, ma girava SOLO se qualcuno si
#  ricordava di lanciarlo: `crontab -l` → 0 righe, `~/Library/LaunchAgents` → 0.
#  Una rete che dipende dalla memoria di qualcuno non è una rete.
#
#  🛑 QUESTO INVOLUCRO NON È UN DETTAGLIO — È LA PARTE CHE PUÒ FALLIRE.
#  Un lavoro lanciato da `launchd` NON eredita l'ambiente del terminale:
#    · il PATH è minimo, e `node` (in /opt/homebrew/bin) e `npx` (in
#      /usr/local/bin) NON ci sono → il salvataggio morirebbe alla prima riga;
#    · Docker, che `supabase db dump` richiede, NON parte da solo;
#    · e NON PUÒ LEGGERE dentro `~/Downloads`, dove vive il progetto. `provato:`
#      il 04/08/2026 con una sonda lanciata da launchd — `~/Downloads` e ogni
#      livello sotto danno «Operation not permitted», `~/Library` e
#      `~/Backup-UA-database` si leggono. Per questo la copia che gira ogni
#      notte vive in `~/Library/Application Support/UA-salvataggio/`.
#  🔑 E un salvataggio automatico che fallisce in silenzio è PEGGIO di uno a
#  mano, perché fabbrica esattamente la falsa sicurezza che il ripristino del
#  04/08/2026 ha smontato: «il primo sembrava perfetto… e nessuno poteva entrare».
#  Per questo qui dentro ogni fallimento è RUMOROSO: notifica di sistema + un
#  file di allarme sulla Scrivania che resta finché il salvataggio non riesce.
#
#  ⚠️ CHE COSA QUESTO NON COMPRA. Un lavoro `launchd` di utente parte solo se il
#  Mac è acceso e Francesco ha fatto l'accesso. Se il Mac resta spento, non parte
#  (launchd lo recupera al primo risveglio utile, ma un giorno saltato è saltato).
#  Toglie la dipendenza dalla MEMORIA di qualcuno; NON garantisce una copia al
#  giorno. Quella la dà solo il piano a pagamento di Supabase — D137 (c) · P20.
#
#  USO A MANO:  bash scripts/salvataggio-programmato.sh
#  INSTALLA:    bash scripts/installa-salvataggio-programmato.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail   # 🛑 NON -e: gli errori qui si gestiscono, non si subiscono

# ── L'ambiente che launchd non dà ────────────────────────────────────────────
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

QUI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINAZIONE="${HOME}/Backup-UA-database"
DIARIO="${DESTINAZIONE}/diario.log"
STATO="${DESTINAZIONE}/ULTIMO-ESITO.txt"
# 🔑 L'allarme sta in DUE posti, e non è ridondanza inutile:
#    · sulla Scrivania perché è l'unico che Francesco VEDE senza cercarlo
#      (`provato:` un lavoro launchd non può ELENCARE la Scrivania, ma il file
#      che ha creato lui lo scrive, lo rilegge e lo cancella: basta);
#    · in ~/Backup-UA-database perché quella cartella si legge SEMPRE, ed è da
#      lì che `guardia-salvataggio-installato.mjs` se ne accorge al commit —
#      cioè in un posto dove Francesco passa davvero.
ALLARME="${HOME}/Desktop/⚠️ SALVATAGGIO UA FALLITO.txt"
ALLARME_SICURO="${DESTINAZIONE}/ALLARME.txt"
COPIE_DA_TENERE=14
ATTESA_DOCKER_SECONDI=180

mkdir -p "${DESTINAZIONE}"
chmod 700 "${DESTINAZIONE}" 2>/dev/null || true

nota() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${DIARIO}"; }

# ── Il fallimento si VEDE: notifica + file sulla Scrivania ───────────────────
fallisci() {
  local MOTIVO="$1"
  nota "🛑 FALLITO — ${MOTIVO}"
  {
    echo "SALVATAGGIO DEL DATABASE UÀ — NON RIUSCITO"
    echo
    # 🔑 data in cifre: un lavoro launchd non eredita la lingua del Mac, e
    #    `%A` uscirebbe in inglese («Sunday»). Misurato il 04/08/2026.
    echo "Quando:  $(date '+%d/%m/%Y alle %H:%M')"
    echo "Perché:  ${MOTIVO}"
    echo
    echo "Che cosa vuol dire: la copia di sicurezza del database di oggi NON è stata fatta."
    echo "L'ultima copia riuscita è quella indicata in ~/Backup-UA-database/ULTIMO-ESITO.txt"
    echo
    echo "Come si rimedia a mano, da Terminale:"
    echo "  bash '${QUI}/scripts/salvataggio-programmato.sh'"
    echo
    echo "Questo file sparisce da solo al primo salvataggio riuscito."
    echo "Diario completo: ${DIARIO}"
  } > "${ALLARME_SICURO}"
  cp "${ALLARME_SICURO}" "${ALLARME}" 2>/dev/null || true
  osascript -e 'display notification "Il salvataggio del database non è riuscito. Guarda il file sulla Scrivania." with title "UÀ — salvataggio FALLITO" sound name "Basso"' 2>/dev/null || true
  printf 'FALLITO  %s  — %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "${MOTIVO}" > "${STATO}"
  exit 1
}

nota "── avvio salvataggio programmato ──"

# ── ① L'anzianità dell'ultima copia, prima di tutto ──────────────────────────
#    Se il Mac è stato spento a lungo, il lavoro non è partito e nessuno se n'è
#    accorto: il numero si scrive nel diario, così il buco resta visibile.
ULTIMA="$(find "${DESTINAZIONE}" -maxdepth 1 -type d -name '20*_*' 2>/dev/null | sort | tail -1)"
if [ -n "${ULTIMA}" ]; then
  GIORNI=$(( ( $(date +%s) - $(stat -f %m "${ULTIMA}") ) / 86400 ))
  nota "ultima copia: $(basename "${ULTIMA}") — ${GIORNI} giorni fa"
  [ "${GIORNI}" -ge 3 ] && nota "⚠️ sono passati ${GIORNI} giorni dall'ultima copia"
else
  nota "⚠️ nessuna copia precedente sul disco"
fi

# ── ② Docker: si accende, e si ASPETTA che risponda davvero ──────────────────
#    🔑 `open -a Docker` torna subito; il demone ci mette secondi. Chi non
#    aspetta trova un errore che sembra un guasto del database.
if ! docker info >/dev/null 2>&1; then
  nota "Docker non risponde — lo accendo"
  open -a Docker 2>/dev/null || fallisci "non riesco ad avviare Docker (l'app c'è in /Applications?)"
  ASPETTATO=0
  until docker info >/dev/null 2>&1; do
    sleep 3
    ASPETTATO=$(( ASPETTATO + 3 ))
    if [ "${ASPETTATO}" -ge "${ATTESA_DOCKER_SECONDI}" ]; then
      fallisci "Docker non è partito entro ${ATTESA_DOCKER_SECONDI} secondi"
    fi
  done
  nota "Docker pronto dopo ${ASPETTATO} secondi"
else
  nota "Docker già acceso"
fi

# ── ③ Il salvataggio vero ────────────────────────────────────────────────────
REGISTRO="$(mktemp -t ua-salvataggio)"
if bash "${QUI}/scripts/salvataggio-database.sh" >>"${REGISTRO}" 2>&1; then
  ESITO=0
else
  ESITO=$?
fi
cat "${REGISTRO}" >> "${DIARIO}"

if [ "${ESITO}" -ne 0 ]; then
  CODA="$(tail -5 "${REGISTRO}" | tr '\n' ' ')"
  fallisci "il salvataggio è uscito con codice ${ESITO} — ${CODA}"
fi

# ── ④ Il controllo che il salvataggio sia DAVVERO sul disco ──────────────────
#    🛑 Uscita 0 non basta: si guarda la cartella nuova e la si pesa.
NUOVA="$(find "${DESTINAZIONE}" -maxdepth 1 -type d -name '20*_*' 2>/dev/null | sort | tail -1)"
[ -n "${NUOVA}" ] || fallisci "nessuna cartella nuova in ${DESTINAZIONE}"
for F in ruoli struttura dati struttura-piattaforma dati-piattaforma; do
  [ -s "${NUOVA}/${F}.sql" ] || fallisci "manca o è vuoto ${F}.sql in $(basename "${NUOVA}")"
done
PESO="$(du -sh "${NUOVA}" | cut -f1)"
nota "✅ copia completa: $(basename "${NUOVA}") — ${PESO}"

# ── ⑤ Rotazione: si tengono le ultime ${COPIE_DA_TENERE} copie ───────────────
#    🔑 Senza, il disco si riempie in silenzio — che è lo stesso difetto di
#    prima, dall'altro lato. Ciò che si cancella si SCRIVE nel diario.
QUANTE="$(find "${DESTINAZIONE}" -maxdepth 1 -type d -name '20*_*' 2>/dev/null | wc -l | tr -d ' ')"
if [ "${QUANTE}" -gt "${COPIE_DA_TENERE}" ]; then
  find "${DESTINAZIONE}" -maxdepth 1 -type d -name '20*_*' | sort | head -n $(( QUANTE - COPIE_DA_TENERE )) | while read -r VECCHIA; do
    nota "cancello la copia vecchia: $(basename "${VECCHIA}")"
    /bin/rm -rf "${VECCHIA}"
  done
fi

# ── ⑥ Riuscito: si spegne l'allarme, in tutti e due i posti ─────────────────
[ -f "${ALLARME}" ] && /bin/rm -f "${ALLARME}" && nota "tolto il file di allarme dalla Scrivania"
[ -f "${ALLARME_SICURO}" ] && /bin/rm -f "${ALLARME_SICURO}" && nota "tolto il file di allarme da ${DESTINAZIONE}"
{
  printf 'RIUSCITO  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
  printf 'cartella: %s (%s)\n' "$(basename "${NUOVA}")" "${PESO}"
  printf 'copie conservate: %s (si tengono le ultime %s)\n' \
    "$(find "${DESTINAZIONE}" -maxdepth 1 -type d -name '20*_*' | wc -l | tr -d ' ')" "${COPIE_DA_TENERE}"
} > "${STATO}"
nota "── fine, tutto a posto ──"
