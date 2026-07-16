-- Spec R1 §5 / piano Task 17 step 1: il prefisso <lab>/ricevute-sdi/ del bucket
-- fatture-pdf è riservato al service_role (le ricevute SdI sono evidenza fiscale:
-- scritte solo dall'endpoint upload con nome server-generated, rilette dalla
-- riverifica firma). Le 4 policy client «fatture-pdf: * per membri lab» erano
-- state create da dashboard: qui si esclude il prefisso ricevute-sdi da tutte.
-- (storage.foldername(name))[2] = seconda cartella del path <lab>/ricevute-sdi/<sha>.xml

ALTER POLICY "fatture-pdf: lettura per membri lab" ON storage.objects
  USING (
    bucket_id = 'fatture-pdf'
    AND ((storage.foldername(name))[1])::uuid IN (
      SELECT lab_memberships.laboratorio_id FROM lab_memberships
       WHERE lab_memberships.user_id = auth.uid())
    AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
  );

ALTER POLICY "fatture-pdf: update per membri lab" ON storage.objects
  USING (
    bucket_id = 'fatture-pdf'
    AND ((storage.foldername(name))[1])::uuid IN (
      SELECT lab_memberships.laboratorio_id FROM lab_memberships
       WHERE lab_memberships.user_id = auth.uid())
    AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
  )
  WITH CHECK (
    bucket_id = 'fatture-pdf'
    AND ((storage.foldername(name))[1])::uuid IN (
      SELECT lab_memberships.laboratorio_id FROM lab_memberships
       WHERE lab_memberships.user_id = auth.uid())
    AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
  );

ALTER POLICY "fatture-pdf: delete per membri lab" ON storage.objects
  USING (
    bucket_id = 'fatture-pdf'
    AND ((storage.foldername(name))[1])::uuid IN (
      SELECT lab_memberships.laboratorio_id FROM lab_memberships
       WHERE lab_memberships.user_id = auth.uid())
    AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
  );

ALTER POLICY "fatture-pdf: upload per membri lab" ON storage.objects
  WITH CHECK (
    bucket_id = 'fatture-pdf'
    AND ((storage.foldername(name))[1])::uuid IN (
      SELECT lab_memberships.laboratorio_id FROM lab_memberships
       WHERE lab_memberships.user_id = auth.uid())
    AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
  );
