# Decision record — DS v3 «Il cuore» Ondata 0: mockup approvati

**Data gate:** 12 luglio 2026
**Decisore:** Francesco Formicola
**Esito:** **TUTTE E 6 LE SCHERMATE APPROVATE** («ok, approvo tutte e 6 le schermate, chiudi il gate»), più il file stati non-felici.
**Piano eseguito:** `docs/superpowers/plans/2026-07-09-ds-v3-il-cuore-ondata-0-mockup.md`
**Spec:** figlia `2026-07-09-ds-v3-il-cuore-design.md` · legge madre `2026-07-07-design-system-v3-una-cosa-alla-volta.md`

## Artefatti approvati

`docs/design/mockups/2026-07-09-il-cuore/` — `_base.css` (kit token+14 classi §5) · `home.html` · `pila-aperta.html` · `wizard.html` · `scheda-lavoro.html` · `consegna.html` · `tutto-il-resto.html` · `stati-vuoti-errori.html` · 50 screenshot (3-4 viewport × 2 temi) · `scripts/screenshot-mockups.mjs` (assert anti-scroll home).

## Processo

7 task SDD (implementer+reviewer per task, fix round inclusi) → review finale whole-branch (1 Critical + 4 Important, tutti fixati) → **round di 6 advisor professionali** (visual 8/10 · UX 8/10 · odontotecnico 7/10 · normativo rischio medio · a11y 7/10 · DS engineer 8/10, report in `.superpowers/advisors/` del worktree) → bucket A (10 fix contenuti, approvati da Francesco) → bucket B (7 decisioni di Francesco) → approvazione finale.

## Decisioni di Francesco (bucket B, 12/07)

| # | Decisione |
|---|-----------|
| B1 | `--faint` scurito per AA: light `#7B6A59` · dark `#928778` |
| B2 | Verdi con testo bianco scuriti: WhatsApp `#208650→#17663A` (§3.3.4) · PillFase `#1F8544→#166B39` (§5.4) |
| B3 | **Quarta pila «DA RIFARE / IN PROVA», famiglia viola nuova** (`--purple` light `#7C3F9C`/tint `#F3EAF7`, dark `#B98BE8`/rgba .14); ordine pile: rossa·ambra·viola·blu |
| B4 | La data di consegna la decide il laboratorio (suggerimento UÀ + «Cambia data» — mockup già conforme) |
| B5 | TastoPiu in dark resta senza alone |
| B6 | Architettura desktop route↔pannelli: **spike tecnico come primo task del piano Ondata 1** |
| B7 | Ratificate tutte le deviazioni annotate (elenco sotto) |

## Revisioni di legge madre incise da questa ondata

Da portare nel testo della legge (`2026-07-07-design-system-v3-una-cosa-alla-volta.md`) e in `src/app/ds-v3.css`/`tokens.ts` al primo emendamento (prima o durante l'Ondata 1):

- **§3**: `--faint` scurito (valori sopra); **nuova famiglia viola** `--purple`/`--purple-tint`.
- **§3.3 regola 2 + §5.14**: il divieto del quinto colore di stato decade — il viola diventa famiglia di stato per la pila «DA RIFARE / IN PROVA» (aggiornare anche la tabella migrazione v2.3→v3, voce `--c-purple → SOLO avatar`).
- **§3.3.4**: gradiente WhatsApp scurito.
- **§5.4**: gradiente PillFase scurito (stop pinnati, mai `var(--green)` come faccia).
- **§5.7/§7.1**: home a **4 pile**; regola subline pila (numero lavoro sempre primo, mai tagli a metà parola); scala device-corti ri-dichiarata (numero pila 52→42).
- **§4.2**: deroga — i passi 10 e 14 sono ammessi SOLO nel regime device-corti.
- **§5.9**: estensione vocabolario pill definitiva: `IN PROVA` (famiglia viola); già ammesse `FERMO`, `DA IERI`, `−N GIORNI`.
- **§5.17**: deroga ratificata nel DialogConferma consegna (azione non distruttiva → primario sopra).

## Deviazioni dal piano ratificate (B7)

1. **Scheda F1**: tutte le 4 fasi fatte + CONSEGNA attivo (il piano chiedeva pill FATTA + attivo insieme — incompatibili sotto §7.4/L1; governa la legge).
2. **Wizard «Fatto!»**: chip «Va bene ✓/Decido dopo» sostituiti da riga risolta + LinkQuieto «Cambia data» (advisor UX, L1); percorso minimo 3 tocchi.
3. **Menu scheda**: «Butta via» → «Annulla lavoro» (advisor odontotecnico+normativo: un dispositivo tracciato MDR non si cestina).
4. **Bloccante consegna**: «disilicato» → «zirconia» (coerenza cast n.147).
5. **Copy striscia**: «Fattura n.139 scartata» (il numero sopravvive alla riga unica, §2.2/L3).
6. **Calendario**: date corrette sull'ancora giovedì 9 luglio 2026 (il piano aveva «ven 11» = sabato).
7. **Fasi n.147**: Fresatura→Sinterizzazione→Glasatura→Controllo finale (il cast del piano aveva la catena del metallo su una corona zirconia — advisor odontotecnico).
8. **«→» nel dialog** «Corona n.147 → Dr. Esposito»: testo di piano, ratificato.
9. **768/1280 consegna**: solo il DialogConferma è modale (invariante legge madre).

## Correzioni advisor incorporate (bucket A)

Terzo bloccante «Manca la prescrizione del dentista» (primo — Art. 2(3)+All. XIII MDR) · riga trasparenza annullo (DdC e buono annullati) · «tutto in regola ✓» → «DdC generata a ogni consegna ✓» (mai verdetti di conformità) · target CTA ≥44px · dialog consegna nel contesto shell a 1280 · radius CardInfo 22+4/20 (§5.10) e CardUAHaFatto 22 (§5.22) · stati non-felici (`stati-vuoti-errori.html`: home vuota, pila vuota, consegna non riuscita).

## Note vincolanti per le Ondate 1-4 (bucket C + review)

- **Spike architettura desktop** (route parallele vs master-detail) = primo task del piano Ondata 1 (decisione B6).
- **Emendamento §5.x** per gli ~8 pattern nuovi dei mockup (morph header, wa-btn, bloccante, chip, dots, foto-strip, menu-voce, nav-desk) + token WhatsApp e viola in `tokens.ts`, PRIMA di implementarli.
- **CardLavoro canonico**: margini 12/3 (variante pila-aperta/scheda; il fork con home 10/2 si chiude nel componente unico).
- **A11y React**: aria-live su StrisciaStato e Consegnato!, countdown NON-live, focus-trap sugli overlay, nomi accessibili dei tasti icona.
- **Normativo**: numero DdC assegnato al commit dei 10 minuti (mai a t=0); fase «FATTA» firmata dall'utente autenticato; la logica «non fatturare» confinata ad annullo/reso (mai su consegna trattenuta).
- Cosmetici rimandati: «alle 16» (home) vs «16:00» (scheda); wrap «Le fasi» a 1280 (`minWidth: min-content`, carry-over sp.2).

## Prossimo passo

Merge su `main` → piano **Ondata 1 (Home + pile)** via `superpowers:writing-plans`, derivato SOLO dai mockup approvati qui.
