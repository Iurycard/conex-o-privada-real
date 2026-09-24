ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS wall_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS posts_wall_profile_idx ON public.posts (wall_profile_id, created_at DESC);