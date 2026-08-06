# Sessione attiva — punto di ripresa

🚪 **PUNTO DI RIPRESA — leggi prima questo:** `docs/roadmap/2026-08-06-tinte-t7-t8-handoff.md` — **la §0 per prima**.

**Stato (06/08/2026, 08:20):** ramo **`tinta-scheda-t7`**, albero pulito, ⛔ **NON pubblicato**
(l'hash e il numero di salvataggi si leggono con `git log`, non da qui: un documento non può citare il
proprio salvataggio). `main` = `affec7ae` — in produzione solo **T1-T6**.

🔴 **La §0 in una frase — cinque cose non fatte:** **un rilievo su due resta aperto**, e non per stanchezza
(la premessa «forma identica al gemello del colore» **è dubbia**: per il colore mezza coppia è il caso
NORMALE e voluto, quindi va riverificata prima di scrivere una regola sola) · il **collaudo a schermo non è
mai stato fatto**, e da adesso **è possibile** perché il campo esiste · il **gate estetico L2 è dovuto su
DUE superfici** e non c'è nessuno scatto · **D253 sul colore è sospesa** fino a D254 · igiene: **32 rami
locali**, `.superpowers/sdd/` mai archiviata.

✅ **Fatto:** **T7** intero · **T8 a metà** (campo in pagina, i tre lettori, D253 sulla tinta) · **P8-①**,
un difetto che il T8 stesso avrebbe creato (il form nominava sempre la tinta e rendeva irraggiungibile il
ramo D117) · **D251-D254** a verbale.

📌 **Misurato in chiusura:** `verify:full` **uscita 0** · tsc 0 · eslint 0 · build ok · sette guardie verdi ·
`vitest` **5057 passate | 19 saltate** (427 file | 3 saltati). Ieri sera: 5016|19 su 422.

➡️ **Prima cosa:** riverificare se tinta e colore siano **lo stesso caso**, poi il **collaudo a schermo**.

🧭 **06/08 mattina — audit del processo, D256-D259 (centotreesima tornata):** i **panel restano** (D256) ·
**riordino della memoria approvato** (D257, ondata dedicata **DOPO T8/T9** — voce ⑥ FASE 1 in roadmap) ·
il **diario resta vivo** in `memory/diario/` (D258) · **percorso Piccola alleggerito GIÀ in vigore**
(D259, `ua-app/CLAUDE.md` §0C). Referto: `docs/processes/2026-08-06-audit-processo-referto.md`.

📎 259 decisioni in centotré tornate; la prossima è **D260**.

⌨️ **D255:** `/chiudi` è ora un **comando vero** (puntatore alla skill). Se la barra non risponde, il
collegamento nella cartella superiore va rifatto — due righe in `CLAUDE.md` §0E.
