-- Fix: _audit_trigger_fn usava ->> direttamente su RECORD (tipo PostgreSQL)
-- invece di to_jsonb(). Causa: "operator does not exist: laboratori ->> unknown"
-- Fix: converti sempre a JSONB prima, e usa COALESCE per laboratorio_id (assente su laboratori stessa)

CREATE OR REPLACE FUNCTION _audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lab_id UUID;
  v_row_id TEXT;
  v_actor  UUID;
  v_new_json JSONB;
  v_old_json JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_json := to_jsonb(OLD);
    v_row_id   := v_old_json ->> 'id';
    v_lab_id   := COALESCE(
      (v_old_json ->> 'laboratorio_id')::UUID,
      (v_old_json ->> 'id')::UUID
    );
  ELSE
    v_new_json := to_jsonb(NEW);
    v_row_id   := v_new_json ->> 'id';
    v_lab_id   := COALESCE(
      (v_new_json ->> 'laboratorio_id')::UUID,
      (v_new_json ->> 'id')::UUID
    );
  END IF;

  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  INSERT INTO audit_log (table_name, operation, row_id, lab_id, actor_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    v_row_id,
    v_lab_id,
    v_actor,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
