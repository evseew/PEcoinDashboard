// ✅ УНИФИЦИРОВАННЫЙ клиент для загрузки логотипов

interface UploadLogoResult {
  success: boolean
  logoPath?: string
  signedUrl?: string
  fileSize?: number
  fileType?: string
  error?: string
}

/**
 * ✅ ЕДИНАЯ функция загрузки логотипов для всех административных страниц
 */
export async function uploadEntityLogo(
  file: File,
  entityType: 'staff' | 'teams' | 'startups',
  entityId: string
): Promise<UploadLogoResult> {
  try {
    console.log('[Upload Client] 📤 Начинаю загрузку логотипа:', {
      fileName: file.name,
      fileSize: file.size,
      entityType,
      entityId
    })

    // ✅ ПРЕДВАРИТЕЛЬНАЯ валидация на клиенте
    if (!file || !entityType || !entityId) {
      return {
        success: false,
        error: 'Отсутствуют обязательные параметры для загрузки'
      }
    }

    if (file.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: 'Размер файла не должен превышать 5MB'
      }
    }

    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Файл должен быть изображением'
      }
    }

    // ✅ ПОДГОТОВКА FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entityType', entityType)
    formData.append('entityId', entityId)

    // ✅ ОТПРАВКА запроса на новый унифицированный API
    const response = await fetch('/api/upload/logo', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[Upload Client] ❌ HTTP ошибка:', response.status, result)
      return {
        success: false,
        error: result.error || `HTTP ${response.status}: Ошибка загрузки`
      }
    }

    if (!result.success) {
      console.error('[Upload Client] ❌ API ошибка:', result.error)
      return {
        success: false,
        error: result.error || 'Неизвестная ошибка загрузки'
      }
    }

    console.log('[Upload Client] ✅ Логотип успешно загружен:', result.data)

    return {
      success: true,
      logoPath: result.data.logoPath,
      signedUrl: result.data.signedUrl,
      fileSize: result.data.fileSize,
      fileType: result.data.fileType
    }

  } catch (error: any) {
    console.error('[Upload Client] 💥 Критическая ошибка:', error)
    return {
      success: false,
      error: `Критическая ошибка: ${error.message || error}`
    }
  }
}

/**
 * ✅ FALLBACK функция для обработки существующих URL
 */
export function handleExistingLogo(logoValue: unknown): string | null {
  if (!logoValue) return null
  
  if (typeof logoValue === 'string') {
    // Уже строка - возможно путь или URL
    return logoValue
  }
  
  // Неожиданный тип
  console.warn('[Upload Client] ⚠️ Неожиданный тип логотипа:', typeof logoValue)
  return null
} 