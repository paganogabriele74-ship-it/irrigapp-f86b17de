
-- Make user_id optional on programs
ALTER TABLE public.programs ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing user-scoped policies on programs
DROP POLICY IF EXISTS "Users can view own programs" ON public.programs;
DROP POLICY IF EXISTS "Users can insert own programs" ON public.programs;
DROP POLICY IF EXISTS "Users can update own programs" ON public.programs;
DROP POLICY IF EXISTS "Users can delete own programs" ON public.programs;

-- Public access policies on programs
CREATE POLICY "Public can view programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Public can insert programs" ON public.programs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update programs" ON public.programs FOR UPDATE USING (true);
CREATE POLICY "Public can delete programs" ON public.programs FOR DELETE USING (true);

-- Drop existing user-scoped policies on program_times
DROP POLICY IF EXISTS "Users can view own program times" ON public.program_times;
DROP POLICY IF EXISTS "Users can insert own program times" ON public.program_times;
DROP POLICY IF EXISTS "Users can update own program times" ON public.program_times;
DROP POLICY IF EXISTS "Users can delete own program times" ON public.program_times;

-- Public access policies on program_times
CREATE POLICY "Public can view program times" ON public.program_times FOR SELECT USING (true);
CREATE POLICY "Public can insert program times" ON public.program_times FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update program times" ON public.program_times FOR UPDATE USING (true);
CREATE POLICY "Public can delete program times" ON public.program_times FOR DELETE USING (true);

-- Make program-images bucket public
UPDATE storage.buckets SET public = true WHERE id = 'program-images';

-- Public read on program-images storage objects
DROP POLICY IF EXISTS "Public can view program images" ON storage.objects;
CREATE POLICY "Public can view program images" ON storage.objects FOR SELECT USING (bucket_id = 'program-images');

DROP POLICY IF EXISTS "Public can upload program images" ON storage.objects;
CREATE POLICY "Public can upload program images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'program-images');

DROP POLICY IF EXISTS "Public can update program images" ON storage.objects;
CREATE POLICY "Public can update program images" ON storage.objects FOR UPDATE USING (bucket_id = 'program-images');

DROP POLICY IF EXISTS "Public can delete program images" ON storage.objects;
CREATE POLICY "Public can delete program images" ON storage.objects FOR DELETE USING (bucket_id = 'program-images');
