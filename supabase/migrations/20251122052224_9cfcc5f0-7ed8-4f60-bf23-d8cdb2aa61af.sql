-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS superpower text,
ADD COLUMN IF NOT EXISTS kryptonite text,
ADD COLUMN IF NOT EXISTS hobbies text[],
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Available',
ADD COLUMN IF NOT EXISTS timezone text,
ADD COLUMN IF NOT EXISTS best_contact_time text;

-- Create link_boards table
CREATE TABLE IF NOT EXISTS public.link_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '📁',
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create link_items table
CREATE TABLE IF NOT EXISTS public.link_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES public.link_boards(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  thumbnail_url text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.link_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for link_boards
CREATE POLICY "Users can view their own boards"
  ON public.link_boards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own boards"
  ON public.link_boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards"
  ON public.link_boards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards"
  ON public.link_boards FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for link_items
CREATE POLICY "Users can view links in their boards"
  ON public.link_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.link_boards
      WHERE link_boards.id = link_items.board_id
      AND link_boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert links in their boards"
  ON public.link_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.link_boards
      WHERE link_boards.id = link_items.board_id
      AND link_boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update links in their boards"
  ON public.link_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.link_boards
      WHERE link_boards.id = link_items.board_id
      AND link_boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete links in their boards"
  ON public.link_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.link_boards
      WHERE link_boards.id = link_items.board_id
      AND link_boards.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_link_boards_user_id ON public.link_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_link_boards_display_order ON public.link_boards(display_order);
CREATE INDEX IF NOT EXISTS idx_link_items_board_id ON public.link_items(board_id);
CREATE INDEX IF NOT EXISTS idx_link_items_display_order ON public.link_items(display_order);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_link_boards_updated_at
  BEFORE UPDATE ON public.link_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_link_items_updated_at
  BEFORE UPDATE ON public.link_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();