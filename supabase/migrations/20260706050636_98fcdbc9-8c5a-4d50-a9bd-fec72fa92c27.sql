ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'programma';

ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_kind_check;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_kind_check CHECK (kind IN ('programma','farfalla'));