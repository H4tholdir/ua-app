# Audit Flusso UX — Giornata Tipo: Tecnico
**Data:** 2026-05-21 | **Versione app:** V1.5

## Overview del Flusso

Marco, tecnico ceramica 35 anni, smartphone facile. Flusso attorno a 3 viste:
1. Dashboard Tecnico — landing con urgenti, lavori di oggi, prove in rientro, compenso giornaliero
2. Dettaglio Lavoro — long-press → Bottom Sheet o tap diretto
3. Tab Produzione — gestione fasi (ceratura, prove)
4. Segnalazione Problema — sheet per flag al titolare
5. Produttività Personale — tracking compenso settimanale/mensile

---

## Analisi Dettagliata per Fase

### 1. Dashboard Tecnico — Mattina (8:30)

**Componente:** `DashboardTecnico.tsx` | **Tap accesso:** 1 (da login)

**Hero compenso (always above-the-fold):**
```
💰 Compenso oggi
+ €24,50  (verde #16A34A)
"3 lavorazioni completate · mercoledì, 21 maggio"
```

**KPI inline (3 colonne):**
```
[Urgenti: 1]  [Oggi: 5]  [Puntualità %: 84]
```

**Sezioni dinamiche:**
- Urgenti/in ritardo (rosso, primo)
- I miei lavori oggi (5 card ordinate)
- In prova — rientrano oggi

**Intuitività senza training: 9/10** — Hero compenso gratificante, sezioni per priorità, card con swipe actions pronte.

---

### 2. Presa in Carico Lavoro + Fasi Produzione

**Flusso A — Long-press → Bottom Sheet (500ms + hapticMedium):**
- Menu: 👤 Assegna tecnico | ↻ Cambia stato | ↑ Priorità | ✕ Annulla

**Flusso B — Swipe right:**
- Card si sposta, 3 azioni visibili: 👤 Blu | ↻ Oro | ↑ Rosso
- Tap azione → sub-sheet

**Tab Produzione — fasi:**
- Ogni fase: [OK] [Non conf.] [Parziale]
- Tap [OK] → fase marcata con timestamp NOW
- Feedback: pulsante inset shadow + colore verde + timestamp appare

**Tap per fase completata: 1** — Intuitivo, colori semantici.

---

### 3. Segnalazione Problema (modello fratturato)

**Componente:** `SegnalaProblemaSheet.tsx`

**Sheet:**
```
Griglia 2x3:
[🦷 Impronta non idonea]  [🎨 Colore non specificato]
[📋 Istruzione poco chiara] [📦 Materiale esaurito]
[💬 Altro (descrivi sotto)] ← fullWidth

Nota (textarea): "Modello fratturato durante ceratura..."
[⚠ Invia segnalazione] (rosso, disabled se no tipo)
```

**Tap totali: 3-4** | **Feedback:** haptic + visual (banner rosso su pagina) | **Arriva al titolare:** ✅ (Dashboard sezione segnalazioni)

---

### 4. Flow Prove (Uscita)

Marco finisce scheletrata → manda in prova:
1. Tap `[Manda in prova]` in TabProve
2. Form: data rientro prevista + istruzioni opzionali
3. Tap Invia → crea record `lavori_prove`, stato → `in_prova_esterna`

**Tap: 4** | **Intuitività: 8/10**

### Flow Prove (Rientro)

TabProve mostra scheda prova con:
- Esito: [✅ OK] [🔧 Modifiche] [❌ Da rifare] [⏸ Sospeso]
- Note dentista (textarea opzionale)
- [Registra rientro]

**Tap: 3** | **Feedback:** hapticSuccess + lista reload

---

### 5. Fine Giornata: Compenso

**Sempre visibile:** Hero dashboard "Compenso oggi: +€24,50"

**Dettaglio mensile:** Link `📊 La mia produttività` → `/tecnici/[id]/produttivita`
- KPI hero (mese corrente)
- Streak giornaliero timezone-safe
- Barre 4 mesi SVG comparativo
- Tabella lavorazioni completate

**Tap per accedere: 1** | **Intuitività: 10/10** — Motivazionale.

---

## Friction Points Critici 🔴

### 🔴 #1: Transizioni stato non spiegate
Da "in_lavorazione" si può andare a "pronto" O "in_prova_esterna" O "sospeso". Il sub-sheet mostra le opzioni ma non spiega quando usare quale.

**Fix:** Hover/tooltip: "in_prova_esterna = pronto per dentista" vs "sospeso = aspetto materiali"

### 🔴 #2: No visual feedback immediato dopo segnalazione problema
Tag "⚠ Problema segnalato" su LavoroCard appare solo dopo refresh completo.

**Fix:** Aggiorna local state dopo POST, triggera re-render card.

### 🔴 #3: Confusione "Fase completata" vs "Lavoro in prova"
Marco completa tutte le fasi in TabProduzione (tutti OK) ma il lavoro rimane "in_lavorazione". Non capisce quando passa a "pronto".

**Fix:** Suggerimento: "Tutte le fasi completate — pronto per prova?" con CTA.

### 🔴 #4: Data picker rientro prova poco intuitivo iOS
Input type="date" native inconsistente su browser mobile vecchi.

**Fix:** Componente custom con arrow keys e +/- giorni.

### 🔴 #5: Prova rientro inline form caotica su 390px
Textarea + 4 pulsanti + bottone registra → molto scroll su mobile.

**Fix:** Modal bottom sheet per ogni prova.

---

## Funzionalità Mancanti per il Tecnico

| Feature | Impatto | Priorità |
|---------|---------|----------|
| Cronometro fase (timer integrato) | Tracking ore per compenso time-based | V1.7 |
| Push notification rientro prova | Marco scopre rientro solo se apre app | V1.6 |
| Photo/video fase per prova visiva | Marco non può allegare foto ceratura | V2 |
| Compenso breakdown PER lavoro | Vede compenso solo dopo consegna | V1.7 |
| Allarme materiale esaurito pre-inizio | No warning prima di iniziare fase | V1.6 |

---

## Quick Wins ✅

1. Tooltip/help text su transizioni stato (5 min)
2. Loading skeleton per TabProve (10 min)
3. Esporta cedolino settimanale da produttività — già esiste `generate-cedolino-tecnico.ts` (15 min)
4. Indicatore "settimana buona" mini-grafico in dashboard (30 min)
5. Suggerimento CTA dopo tutte le fasi completate (20 min)

---

## Score Flusso Tecnico: 7.5/10

| Area | Score | Note |
|------|-------|------|
| Accesso Dashboard | 10/10 | Hero compenso gratificante |
| Presa in carico lavoro | 8/10 | Swipe + long-press chiari |
| Fasi produzione | 8/10 | UI intuitiva, feedback visivo ok |
| Segnalazione problema | 9/10 | Bottom sheet ottimo, arriva al titolare |
| Flow prove | 7/10 | Functional ma affollato su 390px |
| Visualizzazione compenso | 9/10 | Hero EOD + produttività dettagliata |
| Push notification / Real-time | 3/10 | ASSENTE — Marco non sa se prova rientra |
| Error handling | 6/10 | Errori mostrati ma no retry automatico |

**Verdict:** Flusso solido per il core path. Margini di miglioramento in real-time awareness (prova rientrata) e mobile responsive su forme lunghe. Motivazione alta grazie all'hero compenso sempre visibile. Pronto per produzione con i quick wins prioritari.

---

*Audit completato il 21 maggio 2026*
