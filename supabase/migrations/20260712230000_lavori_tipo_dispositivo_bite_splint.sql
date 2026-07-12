-- Ondata 2 (spec 2026-07-12 §4, decisione D1-ter): macro nuovo bite_splint.
-- Additiva: i 9 valori esistenti restano validi, la validazione passa per costruzione.
ALTER TABLE lavori DROP CONSTRAINT lavori_tipo_dispositivo_check;
ALTER TABLE lavori ADD CONSTRAINT lavori_tipo_dispositivo_check
  CHECK (tipo_dispositivo IN (
    'protesi_fissa','protesi_mobile','implantologia','cad_cam','scheletrato',
    'ortodonzia','provvisorio','riparazione','bite_splint','altro'
  ));
