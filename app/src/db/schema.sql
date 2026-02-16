-- Marathon Datasets Table
CREATE TABLE IF NOT EXISTS marathon_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_name TEXT NOT NULL,
  round_name TEXT DEFAULT 'Marathon',
  round_number INTEGER,
  time_range TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marathon Players Table
CREATE TABLE IF NOT EXISTS marathon_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES marathon_datasets(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  role TEXT DEFAULT 'player' CHECK (role IN ('player', 'captain')),
  avatar_url TEXT,
  day0 NUMERIC,
  day1 NUMERIC,
  day2 NUMERIC,
  day3 NUMERIC,
  day4 NUMERIC,
  day5 NUMERIC,
  day6 NUMERIC,
  day7 NUMERIC,
  day8 NUMERIC,
  day9 NUMERIC,
  day10 NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE marathon_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE marathon_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marathon_datasets
CREATE POLICY "Users can view their own datasets"
  ON marathon_datasets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own datasets"
  ON marathon_datasets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets"
  ON marathon_datasets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets"
  ON marathon_datasets
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for marathon_players
CREATE POLICY "Users can view players in their datasets"
  ON marathon_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marathon_datasets
      WHERE marathon_datasets.id = marathon_players.dataset_id
      AND marathon_datasets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert players in their datasets"
  ON marathon_players
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marathon_datasets
      WHERE marathon_datasets.id = marathon_players.dataset_id
      AND marathon_datasets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update players in their datasets"
  ON marathon_players
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM marathon_datasets
      WHERE marathon_datasets.id = marathon_players.dataset_id
      AND marathon_datasets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marathon_datasets
      WHERE marathon_datasets.id = marathon_players.dataset_id
      AND marathon_datasets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete players in their datasets"
  ON marathon_players
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM marathon_datasets
      WHERE marathon_datasets.id = marathon_players.dataset_id
      AND marathon_datasets.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marathon_datasets_user_id ON marathon_datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_marathon_players_dataset_id ON marathon_players(dataset_id);

-- Create storage bucket for avatars (run this in Supabase Dashboard SQL Editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('marathon-avatars', 'marathon-avatars', true);

-- Storage policies for marathon-avatars bucket
-- CREATE POLICY "Anyone can view avatars"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'marathon-avatars');

-- CREATE POLICY "Authenticated users can upload avatars"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'marathon-avatars' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can update their own avatars"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'marathon-avatars' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can delete their own avatars"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'marathon-avatars' AND auth.role() = 'authenticated');
