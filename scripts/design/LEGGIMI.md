# Da illustrazione a mappa dei denti — la catena

Questi NON sono script temporanei: sono il passo che rigenera la mappa dei denti
ogni volta che le illustrazioni cambiano (decisione W15, 27/07/2026).

    python3 scripts/design/mappa-arcata.py sup     # riconosce i 16 denti, assegna i numeri FDI
    python3 scripts/design/mappa-arcata.py inf
    python3 scripts/design/sagome-denti.py sup     # estrae la SAGOMA di ogni dente
    python3 scripts/design/sagome-denti.py inf
    python3 scripts/design/genera-mockup.py        # ricostruisce il mockup

Le illustrazioni stanno in `docs/design/assets/` (arcata-superiore.png,
arcata-inferiore.png, strisciadenti.png).

**Il riconoscimento si ferma da solo** se non trova esattamente 16 denti per
arcata: è la rete che ha scoperto l'incisivo di troppo nella prima versione
dell'arcata inferiore. Non toglierla.

⚠️ `.gitignore` riga 62 ignora `*.png`: gli asset e gli screenshot vanno aggiunti
con `git add -f`.
⚠️ Il mockup generato incorpora le immagini in base64 e pesa ~30 MB: **non
committarlo**. Si committa il generatore, non il suo prodotto.
