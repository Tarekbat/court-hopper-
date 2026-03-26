-- Group wall: posts, threaded comments, reactions

CREATE TABLE IF NOT EXISTS public.group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 5000),
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_posts_group_id_created ON public.group_posts(group_id, created_at DESC);

CREATE TRIGGER update_group_posts_updated_at
  BEFORE UPDATE ON public.group_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.group_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.group_post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_post_comments_post_id ON public.group_post_comments(post_id, created_at ASC);

CREATE TRIGGER update_group_post_comments_updated_at
  BEFORE UPDATE ON public.group_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.group_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('like', 'celebrate', 'fire')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_post_reactions_post_id ON public.group_post_reactions(post_id);

-- RLS
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read group posts"
  ON public.group_posts FOR SELECT TO authenticated
  USING (group_id IN (SELECT public.get_user_group_ids(auth.uid()::text)));

CREATE POLICY "Members create posts"
  ON public.group_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()::text
    AND group_id IN (SELECT public.get_user_group_ids(auth.uid()::text))
  );

CREATE POLICY "Authors or admins update posts"
  ON public.group_posts FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()::text
    OR public.is_group_admin_or_creator(auth.uid()::text, group_id)
  )
  WITH CHECK (
    author_id = auth.uid()::text
    OR public.is_group_admin_or_creator(auth.uid()::text, group_id)
  );

CREATE POLICY "Authors or admins delete posts"
  ON public.group_posts FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()::text
    OR public.is_group_admin_or_creator(auth.uid()::text, group_id)
  );

CREATE POLICY "Members read comments"
  ON public.group_post_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_posts p
      WHERE p.id = group_post_comments.post_id
        AND p.group_id IN (SELECT public.get_user_group_ids(auth.uid()::text))
    )
  );

CREATE POLICY "Members create comments"
  ON public.group_post_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.group_posts p
      WHERE p.id = group_post_comments.post_id
        AND p.group_id IN (SELECT public.get_user_group_ids(auth.uid()::text))
    )
  );

CREATE POLICY "Authors update own comments"
  ON public.group_post_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()::text)
  WITH CHECK (author_id = auth.uid()::text);

CREATE POLICY "Authors delete own comments"
  ON public.group_post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid()::text);

CREATE POLICY "Members read reactions"
  ON public.group_post_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_posts p
      WHERE p.id = group_post_reactions.post_id
        AND p.group_id IN (SELECT public.get_user_group_ids(auth.uid()::text))
    )
  );

CREATE POLICY "Members react"
  ON public.group_post_reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.group_posts p
      WHERE p.id = group_post_reactions.post_id
        AND p.group_id IN (SELECT public.get_user_group_ids(auth.uid()::text))
    )
  );

CREATE POLICY "Users update own reaction"
  ON public.group_post_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users remove own reaction"
  ON public.group_post_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_post_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_post_comments;
  END IF;
END $$;
