-- Creates the leads table for the Growth Engine

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

-- Enable Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow Project Owners to view/manage leads (using has_role function to avoid recursive issues)
CREATE POLICY "Leads are viewable by Project Owners and assigned Managers" 
ON public.leads FOR SELECT 
USING (
  has_role(auth.uid(), 'project_owner'::app_role) OR 
  assigned_to = auth.uid()
);

CREATE POLICY "Leads are inserted by Project Owners" 
ON public.leads FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'project_owner'::app_role)
);

CREATE POLICY "Leads are updatable by Project Owners and assigned Managers" 
ON public.leads FOR UPDATE 
USING (
  has_role(auth.uid(), 'project_owner'::app_role) OR 
  assigned_to = auth.uid()
);

CREATE POLICY "Leads are deletable by Project Owners" 
ON public.leads FOR DELETE 
USING (
  has_role(auth.uid(), 'project_owner'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();