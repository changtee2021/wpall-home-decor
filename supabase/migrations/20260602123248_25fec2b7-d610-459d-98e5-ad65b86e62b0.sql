
-- topup-slips: private bucket
CREATE POLICY "user upload own slip" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='topup-slips' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user read own slip" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='topup-slips' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "user delete own slip" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='topup-slips' AND auth.uid()::text = (storage.foldername(name))[1]);

-- review-images: read public, write self
CREATE POLICY "anyone read review images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id='review-images');
CREATE POLICY "user upload own review img" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='review-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user delete own review img" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='review-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

-- banners: read public, admin write
CREATE POLICY "anyone read banners" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id='banners');
CREATE POLICY "admin manage banner files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='banners' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='banners' AND public.has_role(auth.uid(),'admin'));
