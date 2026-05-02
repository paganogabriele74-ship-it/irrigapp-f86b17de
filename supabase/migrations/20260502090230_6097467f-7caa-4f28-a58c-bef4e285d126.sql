
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Revoke public execute
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Replace public listing with owner-only access on storage
DROP POLICY IF EXISTS "Public can view program images" ON storage.objects;
CREATE POLICY "Users can view own program images" ON storage.objects
  FOR SELECT USING (bucket_id = 'program-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Make bucket private (signed urls or owner-only access)
UPDATE storage.buckets SET public = false WHERE id = 'program-images';
