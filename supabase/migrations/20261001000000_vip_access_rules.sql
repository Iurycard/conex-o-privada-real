DROP POLICY IF EXISTS "Cria conversa como participante" ON public.conversations;
CREATE POLICY "VIP inicia conversa"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_a
  AND user_a <> user_b
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.vip = true
  )
);

DROP POLICY IF EXISTS "Cria o proprio pedido" ON public.album_access_requests;
CREATE POLICY "VIP solicita acesso ao album"
ON public.album_access_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND requester_id <> owner_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.vip = true
  )
);

DROP POLICY IF EXISTS "Ve fotos permitidas" ON storage.objects;
CREATE POLICY "Ve fotos permitidas"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'album' AND (
    (storage.foldername(name))[2] = 'public'
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.vip = true
      )
      AND EXISTS (
        SELECT 1
        FROM public.album_access_requests r
        WHERE r.requester_id = auth.uid()
          AND r.owner_id::text = (storage.foldername(name))[1]
          AND r.status = 'approved'
      )
    )
  )
);