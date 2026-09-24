ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS wall_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Posts visiveis para logados'
  ) THEN
    CREATE POLICY "Posts visiveis para logados"
      ON public.posts FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Cria posts como autor'
  ) THEN
    CREATE POLICY "Cria posts como autor"
      ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Edita os proprios posts'
  ) THEN
    CREATE POLICY "Edita os proprios posts"
      ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_wall_profile_idx ON public.posts (wall_profile_id, created_at DESC);
