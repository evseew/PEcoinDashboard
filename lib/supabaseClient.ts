import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadLogo(file: File, entityType: "staff" | "teams" | "startups", entityId: string) {
  const ext = file.name.split('.').pop()
  const filePath = `${entityType}/${entityId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('dashboard.logos')
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  return filePath
} 