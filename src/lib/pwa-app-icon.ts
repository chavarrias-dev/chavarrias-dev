const SUPABASE_PUBLIC_STORAGE =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ??
  "https://chsdpusnekhqbzqjlpbb.supabase.co";

/** Icon shown when the PWA is added to the home screen (Supabase Storage). */
export const PWA_APP_ICON_URL = `${SUPABASE_PUBLIC_STORAGE}/storage/v1/object/public/crm-documents/fotos/LOGO_APP.jpg`;

export const PWA_APP_ICON_TYPE = "image/jpeg";
