
CREATE TABLE public.company_settings (
  user_id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  legal_mention text NOT NULL DEFAULT 'EI',
  address text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  siret text NOT NULL DEFAULT '',
  ape_code text NOT NULL DEFAULT '',
  rcs_rm text NOT NULL DEFAULT '',
  insurance text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  iban text NOT NULL DEFAULT '',
  bic text NOT NULL DEFAULT '',
  payment_terms_days integer NOT NULL DEFAULT 30,
  quote_validity_days integer NOT NULL DEFAULT 30,
  late_penalty text NOT NULL DEFAULT 'trois fois le taux d''intérêt légal',
  footer_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.company_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'France',
  siren text NOT NULL DEFAULT '',
  vat_number text NOT NULL DEFAULT '',
  is_professional boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clients" ON public.clients FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'unité',
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'service',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products" ON public.products FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('quote','invoice','credit_note')),
  number text,
  status text NOT NULL DEFAULT 'draft',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_snapshot jsonb,
  company_snapshot jsonb,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  valid_until date,
  service_date text NOT NULL DEFAULT '',
  operation_category text NOT NULL DEFAULT 'services',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  payment_method text NOT NULL DEFAULT 'Virement bancaire',
  source_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  paid_at date,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Legal protection: finalized invoices/credit notes cannot be modified (except status/payment) or deleted
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
CREATE TRIGGER documents_protect BEFORE UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_finalized_documents();

-- Finalize: assigns a sequential, gap-free number and freezes snapshots
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
  IF NOT FOUND OR s.name = '' OR s.siret = '' OR s.address = '' THEN
    RAISE EXCEPTION 'Complétez vos informations d''entreprise (nom, adresse, SIRET) avant d''émettre.';
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
GRANT EXECUTE ON FUNCTION public.finalize_document(uuid) TO authenticated;
