import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

// Esta función guardará o actualizará al usuario cuando entre al CRM
export async function upsertProfile(id: string, email: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id,
      email,
      role: "cliente", // Por defecto
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}