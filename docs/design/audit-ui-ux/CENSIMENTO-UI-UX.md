# Censimento UI/UX — backlog vivo dei difetti estetici e di esperienza

**Istituito il 22/07/2026 su ratifica di Francesco.** Regola d'uso:

> **Censire subito, risolvere quando si tocca la superficie.** Ogni difetto grafico/UX notato
> (da Francesco in uso, da Claude in QA, dai gate L2) va annotato QUI con contesto sufficiente a
> ritrovarlo — pagina, viewport, tema, come riprodurlo, screenshot se esiste. NON si fixa al volo:
> chi migra o rilavora quella superficie si porta dietro le sue voci; ciò che sopravvive arriva
> alla review finale globale (Livello 3, `LIVELLO-3-audit-capillare-finale.md`) già organizzato.
> Eccezione: difetti che bloccano l'uso o violano un gate d'ondata → si fixano nell'ondata.

**Formato voce:** `| data | superficie (route) | viewport/tema | difetto | origine | stato |`
Stati: `aperto` · `in ondata <nome>` · `risolto <commit>` · `deciso-non-fixare <motivo>`.

---

## Voci aperte

| Data | Superficie | Viewport/tema | Difetto | Origine | Stato |
|------|-----------|---------------|---------|---------|-------|
| 22/07 | /cassette sheet (ds `Sheet.tsx`) | tutte | Focus non intrappolato nello sheet: Tab esce verso la pagina sotto nonostante `aria-modal` (gap DS-wide) | Gate L2 Parete (R2) | aperto |
| 22/07 | ds `DialogConferma` | 390 | Modal centrato su mobile (anti-pattern §0B) + `role="dialog"` invece di `alertdialog` — componente DS ratificato, deroga di sistema da rivalutare | Gate L2 Parete (R3) | aperto |
| 22/07 | ds `Sheet.tsx` v3 | iPhone PWA standalone | Manca `env(safe-area-inset-bottom)`: «Chiudi» rischia l'home indicator | Gate L2 Parete (R4) | aperto |
| 22/07 | /cassette tile | tutte | Testo «libera» opacity .6 → contrasto 2,75:1 sulla faccia grigia (sotto AA) — verbatim dal mockup ratificato; alzare a ~.85 in una passata futura | Gate L2 Parete (R1) | deciso-non-fixare (ratificato nel mockup; rivalutare a review finale) |
| 22/07 | ds `ChipScelta` | tutte | `aria-pressed` emesso anche su chip usate come azione (semantica toggle su comando) — serve variante del componente, decisione trasversale al catalogo | Review finale Parete (Minor 7) | aperto |
| 22/07 | /cassette `SwatchesColore` | tutte | `<input type="color">` senza `value`: il picker di sistema si apre su #000000 invece che sul colore attuale — fix pulito richiede mappa slug→hex nel ds (oggi vietata nei .tsx) | Review finale Parete (Minor 14) | aperto |
| 22/07 | /cassette `SwatchesColore` | tutte | Con hex pending lo swatch custom porta `aria-pressed="true"`+✓ pur non essendo il colore salvato: serve segnale «in sospeso» distinto (decisione design) | Review finale Parete (Minor 11) | aperto |
| 22/07 | /cassette sheet | tutte | gap/margin crudi `10px` fuori scala `spazio` (CassettaSheet ~289/312/336 · NuovaCassettaSheet ~103 · HomeV3:137) — ratificati a pixel nei mockup: armonizzare solo con ratifica | Review finale Parete (Minor 10) | aperto |
| 22/07 | /cassette drag | touch | Annuncio SR di successo emesso PRIMA della POST del drag (rollback muto per chi non vede) — coerente con deroga a11y ratificata; fix noto nel ramo `else` | Review finale Parete (Minor 15) | aperto |
| 22/07 | /cassette drag | touch | Ghost scostabile di px se il drop cade nella finestra FLIP · auto-scroll min 1px a msIngaggio=0 — decidere su evidenza device in produzione | Review finale Parete (Minor 16) | aperto |
| 22/07 | processo | — | Checklist L2 §4 dice «DM Sans ovunque» ma la spec v3 prescrive Plus Jakarta Sans: aggiornare la checklist | Gate L2 Parete (N1) | aperto |

## Come aggiungere una voce

Aggiungi una riga alla tabella. Se hai uno screenshot, salvalo in
`docs/design/screenshots/censimento/` con nome `YYYY-MM-DD-<slug>.png` e citalo nella voce.
Le segnalazioni a voce di Francesco («ho notato che…») vanno trascritte qui nella prima sessione
utile, con la route e il contesto ricostruiti.
