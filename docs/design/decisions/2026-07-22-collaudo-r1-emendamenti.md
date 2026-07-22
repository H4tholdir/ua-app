# Emendamenti dal Collaudo R1 (22/07/2026)
- **§3.3 home no-scroll** → «no-scroll finché il contenuto sta nel viewport; quando sfora, la
  home scorre (mai tagliare contenuto)». Origine: collaudo device 22/07, punto 3 (pile coperte).
- **Header scheda lavoro (P10b):** sotto 768px la pill di stato scende su una seconda riga.
- **Ricerca (P7):** clear nativo `type="search"` nascosto ovunque; la «×» è del design system.
- **Gap testata scheda (Task 2):** lo snippet del piano diceva `gap: 8px`, ma l'originale usava `spazio.sm` = 12px — vince il requisito «layout ≥768 INVARIATO»: applicato 12px.
- **«×» ricerca v2.3 (Task 6):** le tre liste clienti/pazienti/magazzino avevano GIÀ una «×» custom (badge 28px «Cancella ricerca», senza refocus) che il piano non prevedeva — adattata in place: etichetta «Svuota la ricerca», helper condiviso `svuotaRicerca` (con refocus), hit area ≥44px, visual invariato.
- **P11c revisione (ratifica 22/07 sera):** il solo gradiente schiarito non bastava — su faccia
  quasi-nera l'intera anatomia scura (cavità, ombra interna, linguetta) è invisibile. Scelta
  Variante A «nero fedele» su screenshot reali (panel ux+frontend concorde): classe `is-nera`
  (luminanza < 0.08) con strategia speculare (bordo-luce, highlight top, rim chiaro sull'incavo,
  linguetta schiarita) + floor sul gradiente (#000 → #3A3A3A→#101010, mai nero assoluto).
  Varianti considerate in docs/design/mockups/screenshots/2026-07-22-nero-cassetta/.
