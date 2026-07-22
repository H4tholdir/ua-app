# Emendamenti dal Collaudo R1 (22/07/2026)
- **§3.3 home no-scroll** → «no-scroll finché il contenuto sta nel viewport; quando sfora, la
  home scorre (mai tagliare contenuto)». Origine: collaudo device 22/07, punto 3 (pile coperte).
- **Header scheda lavoro (P10b):** sotto 768px la pill di stato scende su una seconda riga.
- **Ricerca (P7):** clear nativo `type="search"` nascosto ovunque; la «×» è del design system.
- **Gap testata scheda (Task 2):** lo snippet del piano diceva `gap: 8px`, ma l'originale usava `spazio.sm` = 12px — vince il requisito «layout ≥768 INVARIATO»: applicato 12px.
- **«×» ricerca v2.3 (Task 6):** le tre liste clienti/pazienti/magazzino avevano GIÀ una «×» custom (badge 28px «Cancella ricerca», senza refocus) che il piano non prevedeva — adattata in place: etichetta «Svuota la ricerca», helper condiviso `svuotaRicerca` (con refocus), hit area ≥44px, visual invariato.
