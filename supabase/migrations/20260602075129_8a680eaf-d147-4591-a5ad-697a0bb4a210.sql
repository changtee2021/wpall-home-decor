
CREATE POLICY "anyone read product files objects" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-files');
CREATE POLICY "admin upload product files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update product files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete product files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-files' AND public.has_role(auth.uid(),'admin'));
