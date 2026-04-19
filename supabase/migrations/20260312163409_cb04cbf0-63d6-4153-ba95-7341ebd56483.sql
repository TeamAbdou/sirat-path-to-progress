-- Add age_group and parent_email to profiles for minor protection
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age_group text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_email text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS disclaimer_accepted boolean DEFAULT false;

-- Create badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id text NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges" ON public.user_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges" ON public.user_badges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);