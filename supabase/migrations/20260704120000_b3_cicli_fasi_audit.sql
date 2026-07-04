ALTER TABLE public.cicli_produzione
  ADD COLUMN updated_by uuid REFERENCES public.utenti(id);

ALTER TABLE public.fasi_produzione
  ADD COLUMN updated_by uuid REFERENCES public.utenti(id);

CREATE TRIGGER _audit_cicli_produzione
  AFTER INSERT OR DELETE OR UPDATE ON public.cicli_produzione
  FOR EACH ROW EXECUTE FUNCTION _audit_trigger_fn();

CREATE TRIGGER _audit_fasi_produzione
  AFTER INSERT OR DELETE OR UPDATE ON public.fasi_produzione
  FOR EACH ROW EXECUTE FUNCTION _audit_trigger_fn();
