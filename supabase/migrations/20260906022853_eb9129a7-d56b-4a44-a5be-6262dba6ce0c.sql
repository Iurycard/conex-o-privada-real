CREATE POLICY "Envia as proprias fotos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'album' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Atualiza as proprias fotos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'album' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'album' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Apaga as proprias fotos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'album' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Ve fotos permitidas"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'album' AND (
    (storage.foldername(name))[2] = 'public'
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.album_access_requests r
      WHERE r.requester_id = auth.uid()
        AND r.owner_id::text = (storage.foldername(name))[1]
        AND r.status = 'approved'
    )
  )
);