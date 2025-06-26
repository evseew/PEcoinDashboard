import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'

// Логируем состояние переменных окружения при инициализации
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('[Supabase] ⚠️ Используются placeholder значения для переменных окружения')
  console.warn('[Supabase] Создайте файл .env.local для полной функциональности')
  console.warn('[Supabase] См. README_TROUBLESHOOTING.md для инструкций')
}

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