import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  path: string | null;
  alt?: string;
  className?: string;
}

/** Loads a private storage file via signed URL. */
export const SignedImage = ({ path, alt, className }: Props) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage.from("program-images").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancel) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancel = true; };
  }, [path]);

  if (!path || !url) return null;
  return <img src={url} alt={alt ?? ""} className={className} loading="lazy" />;
};
