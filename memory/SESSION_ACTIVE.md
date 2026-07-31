# Sessione attiva — uscita degli strati + riparazioni della DdC, tutto IN PRODUZIONE

🚪 **PUNTO DI RIPRESA: `docs/roadmap/ROADMAP-UFFICIALE.md`** — l'handoff dell'ondata (b)
(`docs/roadmap/2026-08-02-ondata-b-chiusa-handoff.md`) è **consumato**: la sua §0 e la sua terza voce sono
chiuse. Le voci ancora pronte stanno in testa alla roadmap.

🚀 **`main` = `30f6f3e7`**, allineato con origin, albero pulito, CI verde, deploy Vercel `success`.
**Niente a metà, niente da salvare.**

⏱️ **D99-D100 — l'uscita dei quattro strati sopra la foto** (visore, tendina, i due fogli): simmetrica
(`molla.smooth`), che è ciò che §5.39 diceva già — **nessun emendamento alla spec**. Lo strato in uscita
**smette di prendere i tocchi** (`StratoRadice.tsx`, `useIsPresent`) e lo scorrimento si rilascia a uscita
finita (`useScorrimentoBloccato.ts`). **Verificato dal vivo su uachelab.com.**

📜 **D101-D102 — la Dichiarazione di Conformità.** La terza voce aperta dell'handoff è chiusa: il colore
**non è nella DdC**, ma la norma **non lo nomina** — il buco vero è «*le caratteristiche indicate nella
prescrizione*», e il dato «prescritto» **non esiste in banca dati**. D101 scarta per iscritto la
composizione dai campi di caso (panel di tre). D102 ha fatto: le **due impronte** del documento (mai
scritte prima), il **PDF che smette di leggere dati vivi**, e la **migration `20260803090000` applicata**
(fotografia dei denti spostata su `dichiarazioni_conformita`).

🔴 **NON verificato dal vivo:** che una DdC NUOVA nasca con le due impronte valorizzate — si prova solo
**consegnando un lavoro in produzione**, e non è stato fatto.

⚠️ **Aperte e riferite (R-E2):** `Sheet` non usa `useScorrimentoBloccato` · il primo braccio della guardia
navigazione-overlay non è misurato (serve la fixture `E2E-CAS-002`) · **tre questioni normative**: la DdC non
arriva al paziente (Art. 21(2)), il nome completo dove basta un codice, la prescrizione senza firma ·
`ANALISI/17:127` presenta come norma una glossa sul colore, **va corretta** · l'orologio del Mac dice 31/07,
i documenti 03/08.

📎 Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centodue** decisioni.
Prossima: **D103**.
