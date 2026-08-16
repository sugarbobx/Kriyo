import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export async function getActiveUserId(fallback = 'local-user') {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? fallback;
  } catch {
    return fallback;
  }
}
