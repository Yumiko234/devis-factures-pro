
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deposits jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.protect_finalized_documents()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.number IS NOT NULL AND OLD.type IN ('invoice','credit_note') THEN
      RAISE EXCEPTION 'Une facture numérotée ne peut pas être supprimée. Émettez un avoir.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.number IS NOT NULL AND OLD.type IN ('invoice','credit_note') THEN
    IF NEW.items IS DISTINCT FROM OLD.items OR NEW.total IS DISTINCT FROM OLD.total
       OR NEW.deposits IS DISTINCT FROM OLD.deposits
       OR NEW.number IS DISTINCT FROM OLD.number OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
       OR NEW.client_snapshot IS DISTINCT FROM OLD.client_snapshot
       OR NEW.company_snapshot IS DISTINCT FROM OLD.company_snapshot
       OR NEW.type IS DISTINCT FROM OLD.type THEN
      RAISE EXCEPTION 'Une facture émise ne peut plus être modifiée.';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.finalize_document(_doc_id uuid)
RETURNS public.documents LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  d public.documents;
  s public.company_settings;
  c public.clients;
  prefix text;
  yr text;
  n integer;
BEGIN
  SELECT * INTO d FROM public.documents WHERE id = _doc_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Document introuvable'; END IF;
  IF d.number IS NOT NULL THEN RETURN d; END IF;
  SELECT * INTO s FROM public.company_settings WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR s.name = '' OR s.address = '' THEN
    RAISE EXCEPTION 'Complétez vos informations d''entreprise (nom, adresse) avant d''émettre.';
  END IF;
  IF d.client_id IS NULL THEN RAISE EXCEPTION 'Choisissez un client.'; END IF;
  SELECT * INTO c FROM public.clients WHERE id = d.client_id;
  IF jsonb_array_length(d.items) = 0 THEN RAISE EXCEPTION 'Ajoutez au moins une ligne.'; END IF;
  prefix := CASE d.type WHEN 'quote' THEN 'D' WHEN 'invoice' THEN 'F' ELSE 'AV' END;
  yr := to_char(d.issue_date, 'YYYY');
  SELECT COALESCE(MAX(split_part(number, '-', 3)::int), 0) + 1 INTO n
    FROM public.documents
    WHERE user_id = auth.uid() AND type = d.type AND number LIKE prefix || '-' || yr || '-%';
  UPDATE public.documents SET
    number = prefix || '-' || yr || '-' || lpad(n::text, 4, '0'),
    status = CASE d.type WHEN 'quote' THEN 'sent' ELSE 'issued' END,
    finalized_at = now(),
    company_snapshot = to_jsonb(s) - 'user_id' - 'created_at' - 'updated_at',
    client_snapshot = to_jsonb(c) - 'user_id' - 'created_at' - 'notes'
  WHERE id = _doc_id RETURNING * INTO d;
  RETURN d;
END $$;
