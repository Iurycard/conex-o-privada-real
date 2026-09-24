CREATE OR REPLACE FUNCTION public.sync_post_interaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    UPDATE public.posts
    SET likes = (
      SELECT count(*)::integer FROM public.post_likes WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
    )
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  ELSE
    UPDATE public.posts
    SET comments = (
      SELECT count(*)::integer FROM public.post_comments WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
    )
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_post_likes_count ON public.post_likes;
CREATE TRIGGER sync_post_likes_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();

DROP TRIGGER IF EXISTS sync_post_comments_count ON public.post_comments;
CREATE TRIGGER sync_post_comments_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_interaction_counts();

UPDATE public.posts AS posts
SET likes = counts.total
FROM (
  SELECT posts.id, count(post_likes.id)::integer AS total
  FROM public.posts AS posts
  LEFT JOIN public.post_likes ON post_likes.post_id = posts.id
  GROUP BY posts.id
) AS counts
WHERE posts.id = counts.id;

UPDATE public.posts AS posts
SET comments = counts.total
FROM (
  SELECT posts.id, count(post_comments.id)::integer AS total
  FROM public.posts AS posts
  LEFT JOIN public.post_comments ON post_comments.post_id = posts.id
  GROUP BY posts.id
) AS counts
WHERE posts.id = counts.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'posts'
      AND policyname = 'Apaga os proprios posts'
  ) THEN
    CREATE POLICY "Apaga os proprios posts"
      ON public.posts FOR DELETE TO authenticated
      USING (auth.uid() = author_id);
  END IF;
END $$;