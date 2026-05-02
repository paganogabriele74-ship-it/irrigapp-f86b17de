import { supabase } from "@/integrations/supabase/client";

interface Props {
  path: string | null;
  alt?: string;
  className?: string;
}

/** Loads a public storage file via public URL. */
export const SignedImage = ({ path, alt, className }: Props) => {
  if (!path) return null;
  const { data } = supabase.storage.from("program-images").getPublicUrl(path);
  if (!data?.publicUrl) return null;
  return <img src={data.publicUrl} alt={alt ?? ""} className={className} loading="lazy" />;
};
