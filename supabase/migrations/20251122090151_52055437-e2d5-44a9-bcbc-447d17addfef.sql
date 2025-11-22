-- Add birthday fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS birth_month integer,
ADD COLUMN IF NOT EXISTS birth_day integer;

-- Create broadcasts table
CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  is_pinned boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT priority_check CHECK (priority IN ('high', 'medium', 'low'))
);

-- Create hall_of_fame table
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  month_year text NOT NULL,
  achievement_title text NOT NULL,
  description text NOT NULL,
  nominated_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Create team_chat_messages table
CREATE TABLE IF NOT EXISTS team_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_type_check CHECK (message_type IN ('text', 'image', 'celebration'))
);

-- Create chat_reactions table
CREATE TABLE IF NOT EXISTS chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES team_chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broadcasts
CREATE POLICY "Anyone can view broadcasts"
  ON broadcasts FOR SELECT
  USING (true);

CREATE POLICY "Managers can create broadcasts"
  ON broadcasts FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'project_manager'::app_role) OR 
    has_role(auth.uid(), 'project_owner'::app_role)
  );

CREATE POLICY "Managers can update broadcasts"
  ON broadcasts FOR UPDATE
  USING (
    has_role(auth.uid(), 'project_manager'::app_role) OR 
    has_role(auth.uid(), 'project_owner'::app_role)
  );

CREATE POLICY "Managers can delete broadcasts"
  ON broadcasts FOR DELETE
  USING (
    has_role(auth.uid(), 'project_manager'::app_role) OR 
    has_role(auth.uid(), 'project_owner'::app_role)
  );

-- RLS Policies for hall_of_fame
CREATE POLICY "Anyone can view hall of fame"
  ON hall_of_fame FOR SELECT
  USING (true);

CREATE POLICY "Anyone can nominate for hall of fame"
  ON hall_of_fame FOR INSERT
  WITH CHECK (auth.uid() = nominated_by);

CREATE POLICY "Managers can update hall of fame"
  ON hall_of_fame FOR UPDATE
  USING (
    has_role(auth.uid(), 'project_manager'::app_role) OR 
    has_role(auth.uid(), 'project_owner'::app_role)
  );

CREATE POLICY "Managers can delete hall of fame entries"
  ON hall_of_fame FOR DELETE
  USING (
    has_role(auth.uid(), 'project_manager'::app_role) OR 
    has_role(auth.uid(), 'project_owner'::app_role)
  );

-- RLS Policies for team_chat_messages
CREATE POLICY "Anyone can view chat messages"
  ON team_chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON team_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
  ON team_chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON team_chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_reactions
CREATE POLICY "Anyone can view reactions"
  ON chat_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON chat_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON chat_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at on team_chat_messages
CREATE TRIGGER update_team_chat_messages_updated_at
  BEFORE UPDATE ON team_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for team chat
ALTER PUBLICATION supabase_realtime ADD TABLE team_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;