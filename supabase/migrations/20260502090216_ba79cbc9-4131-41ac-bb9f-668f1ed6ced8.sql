
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Dosage enum
CREATE TYPE public.dosage_type AS ENUM ('acqua', 'concime', 'acido');

-- Programs table
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage public.dosage_type NOT NULL DEFAULT 'acqua',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  sectors INTEGER[] NOT NULL DEFAULT '{}',
  days_of_week INTEGER[] NOT NULL DEFAULT '{}', -- 0=domenica ... 6=sabato (ISO: 1=lun..7=dom — useremo 1-7 con 7=domenica)
  active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own programs" ON public.programs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own programs" ON public.programs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own programs" ON public.programs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own programs" ON public.programs
  FOR DELETE USING (auth.uid() = user_id);

-- Program times table
CREATE TABLE public.program_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_program_times_program ON public.program_times(program_id);

ALTER TABLE public.program_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own program times" ON public.program_times
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can insert own program times" ON public.program_times
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can update own program times" ON public.program_times
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can delete own program times" ON public.program_times
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.user_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER programs_updated_at BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('program-images', 'program-images', true);

CREATE POLICY "Public can view program images" ON storage.objects
  FOR SELECT USING (bucket_id = 'program-images');
CREATE POLICY "Users can upload own program images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'program-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own program images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'program-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own program images" ON storage.objects
  FOR DELETE USING (bucket_id = 'program-images' AND auth.uid()::text = (storage.foldername(name))[1]);
