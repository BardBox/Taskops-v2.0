-- Create inspirations table
CREATE TABLE IF NOT EXISTS public.inspirations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    type TEXT CHECK (type IN ('link', 'image', 'video')) NOT NULL,
    content_url TEXT NOT NULL,
    description TEXT,
    tags TEXT [],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Enable RLS
ALTER TABLE public.inspirations ENABLE ROW LEVEL SECURITY;
-- Policies for inspirations
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.inspirations;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.inspirations;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.inspirations;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.inspirations;
CREATE POLICY "Enable read access for all authenticated users" ON public.inspirations FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.inspirations FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable update for users based on user_id" ON public.inspirations FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Note: DELETE used for update permission if needed, but standard update is below
CREATE POLICY "Enable update for users based on user_id_update" ON public.inspirations FOR
UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Enable delete for users based on user_id" ON public.inspirations FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Create inspiration_reactions table
CREATE TABLE IF NOT EXISTS public.inspiration_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inspiration_id UUID REFERENCES public.inspirations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(inspiration_id, user_id, emoji)
);
-- Enable RLS
ALTER TABLE public.inspiration_reactions ENABLE ROW LEVEL SECURITY;
-- Policies for reactions
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.inspiration_reactions;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.inspiration_reactions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.inspiration_reactions;
CREATE POLICY "Enable read access for all authenticated users" ON public.inspiration_reactions FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON public.inspiration_reactions FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable delete for users based on user_id" ON public.inspiration_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Storage bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspiration-assets', 'inspiration-assets', true) ON CONFLICT (id) DO NOTHING;
-- Storage policies
DROP POLICY IF EXISTS "Public Access Inspiration" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Inspiration" ON storage.objects;
CREATE POLICY "Public Access Inspiration" ON storage.objects FOR
SELECT USING (bucket_id = 'inspiration-assets');
CREATE POLICY "Authenticated Upload Inspiration" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'inspiration-assets');