import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { signedUrlCache } from '@/lib/signed-url-cache'

// ✅ ВАЛИДНЫЕ расширения изображений
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB для логотипов

interface UploadLogoResponse {
  success: boolean
  data?: {
    logoPath: string
    signedUrl: string
    fileSize: number
    fileType: string
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadLogoResponse>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string
    
    console.log('[Upload Logo] 📤 Получен запрос:', {
      fileName: file?.name,
      fileSize: file?.size,
      entityType,
      entityId
    })

    // ✅ ВАЛИДАЦИЯ входных данных
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Файл не предоставлен'
      }, { status: 400 })
    }

    if (!entityType || !['staff', 'teams', 'startups'].includes(entityType)) {
      return NextResponse.json({
        success: false,
        error: 'Некорректный тип сущности. Разрешены: staff, teams, startups'
      }, { status: 400 })
    }

    if (!entityId || entityId.length < 1) {
      return NextResponse.json({
        success: false,
        error: 'ID сущности обязателен'
      }, { status: 400 })
    }

    // ✅ ВАЛИДАЦИЯ типа файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'Файл должен быть изображением'
      }, { status: 400 })
    }

    // ✅ ВАЛИДАЦИЯ размера файла
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `Размер файла не должен превышать ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, { status: 400 })
    }

    // ✅ ВАЛИДАЦИЯ расширения файла
    const fileName = file.name.toLowerCase()
    const ext = fileName.split('.').pop()
    
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        success: false,
        error: `Недопустимое расширение файла. Разрешены: ${ALLOWED_EXTENSIONS.join(', ')}`
      }, { status: 400 })
    }

    // ✅ ГЕНЕРАЦИЯ безопасного пути файла
    const safePath = `${entityType}/${entityId}.${ext}`
    
    console.log('[Upload Logo] 📁 Загружаю в Supabase Storage:', safePath)

    // ✅ ЗАГРУЗКА в Supabase Storage с обработкой ошибок
    const { error: uploadError } = await supabase.storage
      .from('dashboard.logos')
      .upload(safePath, file, { 
        upsert: true,  // Перезаписываем существующий файл
        contentType: file.type
      })

    if (uploadError) {
      console.error('[Upload Logo] ❌ Ошибка загрузки в Supabase:', uploadError)
      return NextResponse.json({
        success: false,
        error: `Ошибка загрузки: ${uploadError.message}`
      }, { status: 500 })
    }

    // ✅ ИНВАЛИДАЦИЯ кэша старого URL
    console.log('[Upload Logo] 🗑️ Инвалидирую кэш для:', safePath)
    signedUrlCache.invalidate(safePath)

    // ✅ ПОЛУЧЕНИЕ нового signed URL
    const signedUrl = await signedUrlCache.getSignedUrl(safePath)
    
    if (!signedUrl) {
      console.error('[Upload Logo] ❌ Не удалось получить signed URL')
      return NextResponse.json({
        success: false,
        error: 'Файл загружен, но не удалось получить URL для отображения'
      }, { status: 500 })
    }

    console.log('[Upload Logo] ✅ Успешно загружен:', {
      path: safePath,
      size: file.size,
      type: file.type
    })

    // ✅ ВОЗВРАТ успешного результата
    return NextResponse.json({
      success: true,
      data: {
        logoPath: safePath,
        signedUrl,
        fileSize: file.size,
        fileType: file.type
      }
    })

  } catch (error: any) {
    console.error('[Upload Logo] 💥 Критическая ошибка:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при загрузке логотипа'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'Метод GET не поддерживается. Используйте POST для загрузки логотипов.'
  }, { status: 405 })
} 