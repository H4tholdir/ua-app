#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  INSTALLA IL SALVATAGGIO PROGRAMMATO (D139, 04/08/2026)
#
#  Fa due cose:
#   ① installa una COPIA AUTONOMA del salvataggio in
#      ~/Library/Application Support/UA-salvataggio/
#   ② registra presso macOS un lavoro che ogni giorno alle 03:00 la lancia.
#      `provato:` l'orario è registrato davvero — `launchctl print` mostra
#      `com.apple.launchd.calendarinterval` con Hour 3 / Minute 0 e
#      `watching = 1`, quindi non serve un avvio a mano.
#      🛑 **NON VERIFICATO:** che cosa succede se alle 03:00 il Mac è spento o
#      dorme. Finché non lo si prova con un ciclo di sonno vero, **un giorno
#      saltato si conta come saltato**.
#
#  🔑 PERCHÉ UNA COPIA, invece di lanciare gli script dov'è il progetto
#  `provato:` il 04/08/2026 con una sonda lanciata da `launchd`: dentro
#  `~/Downloads` — dove vive il progetto — un lavoro automatico riceve
#  «Operation not permitted» su OGNI livello, mentre `~/Library` e
#  `~/Backup-UA-database` si leggono senza problemi. È la protezione della
#  riservatezza di macOS, non un difetto nostro, e non si aggira dal terminale.
#
#  🛑 IL PREZZO DELLA COPIA, scritto perché non si perda: da qui in poi lo
#  stesso script vive in DUE posti — il progetto (l'originale, quello che si
#  modifica e che finisce nella cronologia) e la copia (quella che gira ogni
#  notte). Se si corregge l'originale e non si rilancia questo installatore, la
#  copia continua a fare la versione vecchia e a dichiararsi riuscita: cioè
#  esattamente la classe di difetto del 04/08, quando un salvataggio sembrava
#  completo e non lo era. ✅ Per questo l'installatore scrive in `ORIGINE.txt`
#  l'IMPRONTA di ogni file, e `scripts/guardia-salvataggio-installato.mjs` —
#  agganciata al pre-commit — FERMA il salvataggio del codice se divergono.
#
#  USO:            bash scripts/installa-salvataggio-programmato.sh
#  PER TOGLIERLO:  launchctl bootout gui/$(id -u)/com.uachelab.salvataggio-database
#  PER VEDERLO:    launchctl print gui/$(id -u)/com.uachelab.salvataggio-database
#  PER PROVARLO:   launchctl kickstart -p gui/$(id -u)/com.uachelab.salvataggio-database
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

QUI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CASA="${HOME}/Library/Application Support/UA-salvataggio"
ETICHETTA="com.uachelab.salvataggio-database"
PLIST="${HOME}/Library/LaunchAgents/${ETICHETTA}.plist"
ORA=3
MINUTO=0

# i file che compongono il salvataggio: l'elenco sta QUI e in un posto solo
DA_COPIARE=(salvataggio-database.sh salvataggio-archivio.mjs salvataggio-programmato.sh)

for F in "${DA_COPIARE[@]}"; do
  [ -f "${QUI}/scripts/${F}" ] || { echo "🛑 manca scripts/${F}" >&2; exit 1; }
done
[ -f "${QUI}/.env.local" ] || { echo "🛑 manca .env.local in ${QUI}" >&2; exit 1; }

# ── ① La copia autonoma ─────────────────────────────────────────────────────
mkdir -p "${CASA}/scripts" "${HOME}/Library/LaunchAgents" "${HOME}/Backup-UA-database"
chmod 700 "${CASA}"

for F in "${DA_COPIARE[@]}"; do
  cp "${QUI}/scripts/${F}" "${CASA}/scripts/${F}"
done

# 🛑 Delle credenziali si copiano SOLO le tre righe che servono: meno cose
#    escono dal progetto, meno cose si possono perdere.
: > "${CASA}/.env.local"
chmod 600 "${CASA}/.env.local"
for V in SUPABASE_DB_URL NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  RIGA="$(grep "^${V}=" "${QUI}/.env.local" || true)"
  [ -n "${RIGA}" ] || { echo "🛑 ${V} non è in .env.local" >&2; exit 1; }
  printf '%s\n' "${RIGA}" >> "${CASA}/.env.local"
done

# ── ② L'impronta della sorgente, per accorgersi della deriva ────────────────
{
  echo "# Da dove viene questa copia, e con quale contenuto (D139)."
  echo "# Lo confronta scripts/guardia-salvataggio-installato.mjs al pre-commit."
  echo "# Se le impronte non tornano, la copia è VECCHIA: rilanciare"
  echo "#   bash scripts/installa-salvataggio-programmato.sh"
  echo "sorgente=${QUI}"
  echo "installato=$(date '+%Y-%m-%d %H:%M:%S')"
  for F in "${DA_COPIARE[@]}"; do
    echo "impronta ${F} $(shasum -a 256 "${QUI}/scripts/${F}" | cut -d' ' -f1)"
  done
} > "${CASA}/ORIGINE.txt"
chmod 600 "${CASA}/ORIGINE.txt"

# ── ③ Il lavoro programmato, che punta alla COPIA ───────────────────────────
cat > "${PLIST}" <<PLISTFINE
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${ETICHETTA}</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${CASA}/scripts/salvataggio-programmato.sh</string>
  </array>

  <!-- ogni giorno alle ${ORA}:0${MINUTO}. Che cosa faccia macOS se a quell'ora
       il Mac è spento o dorme: NON VERIFICATO — v. intestazione dello script -->
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>${ORA}</integer>
    <key>Minute</key><integer>${MINUTO}</integer>
  </dict>

  <!-- 🛑 false: non deve ripartire a ogni accesso, solo all'ora stabilita -->
  <key>RunAtLoad</key>
  <false/>

  <key>WorkingDirectory</key>
  <string>${CASA}</string>

  <!-- launchd non dà il PATH del terminale: node e npx vanno nominati -->
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>

  <key>StandardOutPath</key>
  <string>${HOME}/Backup-UA-database/launchd.log</string>
  <key>StandardErrorPath</key>
  <string>${HOME}/Backup-UA-database/launchd.log</string>

  <key>ProcessType</key>
  <string>Background</string>
  <key>LowPriorityIO</key>
  <true/>
</dict>
</plist>
PLISTFINE

chmod 644 "${PLIST}"

# ricarico: `bootout` può fallire se non era caricato, ed è normale
launchctl bootout "gui/$(id -u)/${ETICHETTA}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "${PLIST}"
launchctl enable "gui/$(id -u)/${ETICHETTA}"

echo "✅ copia autonoma:  ${CASA}"
echo "✅ lavoro:          ${ETICHETTA} — ogni giorno alle $(printf '%02d:%02d' "${ORA}" "${MINUTO}")"
echo "   diario:          ${HOME}/Backup-UA-database/diario.log"
echo "   ultimo esito:    ${HOME}/Backup-UA-database/ULTIMO-ESITO.txt"
echo
launchctl print "gui/$(id -u)/${ETICHETTA}" | grep -E "state|runs|last exit code" | head -4 || true
