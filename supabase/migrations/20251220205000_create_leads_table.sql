-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  title TEXT NOT NULL,
  value NUMERIC,
  stage TEXT NOT NULL CHECK (stage IN ('New', 'Contacted', 'Proposal', 'Negotiation', 'Closed')),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.clients(id),
  google_event_id TEXT,
  google_sheet_row_id TEXT
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Leads are viewable by Project Owners and assigned Managers" 
ON public.leads FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'project_owner'
  ) OR 
  assigned_to = auth.uid()
);

CREATE POLICY "Leads are inserted by Project Owners" 
ON public.leads FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'project_owner'
  )
);

CREATE POLICY "Leads are updatable by Project Owners and assigned Managers" 
ON public.leads FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'project_owner'
  ) OR 
  assigned_to = auth.uid()
);

CREATE POLICY "Leads are deletable by Project Owners" 
ON public.leads FOR DELETE 
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'project_owner'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
