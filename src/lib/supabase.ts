import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Esta función guardará o actualizará al usuario cuando entre al CRM
export async function upsertProfile(id: string, email: string) {
    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: id,
            email: email,
            role: 'cliente' // Por defecto
        }, { onConflict: 'id' });

    if (error) throw error;
}