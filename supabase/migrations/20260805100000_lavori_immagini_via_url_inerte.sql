-- ════════════════════════════════════════════════════════════════════════════
-- D236 (05/08/2026) — via la colonna `lavori_immagini.url`: era NOT NULL,
-- inerte, e portava la riga che invita alla correzione catastrofica.
--
-- 🔴 IL FATTO, MISURATO PRIMA DI TOCCARE (non dedotto):
--     SELECT count(*) righe,
--            count(*) FILTER (WHERE url LIKE '%/object/public/%') public,
--            count(*) FILTER (WHERE url IS NULL) nulle
--     FROM lavori_immagini;
--       → righe = 5 · public = 5 · nulle = 0
--     SELECT public FROM storage.buckets WHERE id='documenti';  →  false
--
--   Cioè: TUTTE le righe portano una URL «pubblica» su un bucket **privato**.
--   Nessuna di quelle URL ha mai funzionato, e nessuna avrebbe potuto.
--
-- 🔑 PERCHÉ NON SERVE A NIENTE: ogni lettore la **sovrascrive** con una URL
--   firmata prima di mostrarla — `app/(app)/lavori/[id]/page.tsx:91` e
--   `.../modifica/page.tsx:88` fanno `img.url = signedImgUrl`. Il valore
--   salvato non arriva MAI a schermo. Il suo unico effetto reale era essere
--   `NOT NULL`: costringeva ogni scrittore a inventarsi un valore.
--
-- 🛑 PERCHÉ NON È SOLO PULIZIA — è la riga R20 del censimento dei rischi.
--   `src/lib/storage/upload.ts` costruiva quella URL e la rotta la salvava:
--   una colonna che si chiama «url» e contiene un indirizzo pubblico è
--   l'invito scritto alla correzione che distrugge tutto — «*le foto non si
--   vedono? rendiamo pubblico il bucket*». E questo progetto un bucket
--   pubblico ce l'ha davvero (`brand`), con cui confonderla.
--   Togliendo la colonna, la tentazione non ha più dove nascere.
--
-- ⚠️ Nessun dato si perde che qualcuno stesse usando: si perdono 5 stringhe
--   che non hanno mai puntato a niente di raggiungibile. Il file resta dov'è —
--   `storage_path` è e resta l'unico riferimento vero.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.lavori_immagini DROP COLUMN IF EXISTS url;

COMMENT ON COLUMN public.lavori_immagini.storage_path IS
  'L''UNICO riferimento al file. La URL si firma al momento di mostrarla (getSignedUrl) e non si conserva: una URL salvata o scade, o è pubblica su un bucket privato — ed era esattamente il caso della colonna `url`, tolta il 05/08/2026 (D236).';
