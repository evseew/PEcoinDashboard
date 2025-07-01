// ✅ УНИФИЦИРОВАННЫЙ клиент для загрузки логотипов

interface UploadLogoResult {
  success: boolean
  logoPath?: string
  signedUrl?: string
  fileSize?: number
  fileType?: string
  error?: string
}

// ✅ ДЕТЕКТОР iPhone/iOS
function isiPhone(): boolean {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent
  return /iPhone|iPad|iPod/.test(userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPad Pro
}

// ✅ СПЕЦИАЛЬНАЯ ЛОГИКА ЗАГРУЗКИ ДЛЯ iPhone
async function uploadEntityLogoiPhone(
  file: File,
  entityType: 'staff' | 'teams' | 'startups',
  entityId: string
): Promise<UploadLogoResult> {
  console.log('[iPhone Upload] 📱 Активирована специальная логика для iPhone')
  
  try {
    // ✅ iPhone-специфичная валидация
    if (file.size > 3 * 1024 * 1024) { // Уменьшенный лимит для iPhone
      return {
        success: false,
        error: 'На iPhone размер файла не должен превышать 3MB'
      }
    }

    // ✅ СЖАТИЕ изображения для iPhone
    const compressedFile = await compressImageForIPhone(file)
    
    // ✅ ПОДГОТОВКА FormData с дополнительными заголовками для iPhone
    const formData = new FormData()
    formData.append('file', compressedFile)
    formData.append('entityType', entityType)
    formData.append('entityId', entityId)
    formData.append('source', 'iPhone') // Маркер для сервера

    // ✅ iPhone-оптимизированный fetch с retry логикой
    let lastError: Error | null = null
    const maxRetries = 3
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[iPhone Upload] 📤 Попытка ${attempt}/${maxRetries}`)
        
        // ✅ AbortController с iPhone-специфичным таймаутом
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 сек для iPhone
        
        const response = await fetch('/api/upload/logo', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          // ✅ iPhone-специфичные заголовки
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-Device-Type': 'iPhone'
          }
        })
        
        clearTimeout(timeoutId)
        
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || `HTTP ${response.status}: Ошибка загрузки`)
        }

        if (!result.success) {
          throw new Error(result.error || 'Неизвестная ошибка загрузки')
        }

        console.log('[iPhone Upload] ✅ Успешно загружено с iPhone:', result.data)
        return {
          success: true,
          logoPath: result.data.logoPath,
          signedUrl: result.data.signedUrl,
          fileSize: result.data.fileSize,
          fileType: result.data.fileType
        }

      } catch (error: any) {
        lastError = error
        console.warn(`[iPhone Upload] ⚠️ Попытка ${attempt} неудачна:`, error.message)
        
        if (attempt < maxRetries) {
          // ✅ Экспоненциальная задержка между попытками
          const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
          console.log(`[iPhone Upload] ⏳ Ожидание ${delay/1000}с перед следующей попыткой`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // Все попытки неудачны
    return {
      success: false,
      error: `iPhone: Не удалось загрузить после ${maxRetries} попыток. ${lastError?.message || 'Неизвестная ошибка'}`
    }

  } catch (error: any) {
    console.error('[iPhone Upload] 💥 Критическая ошибка:', error)
    return {
      success: false,
      error: `iPhone: Критическая ошибка - ${error.message || error}`
    }
  }
}

// ✅ СЖАТИЕ изображения для iPhone
async function compressImageForIPhone(file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // ✅ Максимальные размеры для iPhone
      const maxWidth = 800
      const maxHeight = 800
      
      let { width, height } = img
      
      // Пропорциональное масштабирование
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      // ✅ Рисуем сжатое изображение
      ctx?.drawImage(img, 0, 0, width, height)
      
      // ✅ Конвертируем в blob с iPhone-оптимизированным качеством
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg', // Всегда JPEG для iPhone
              lastModified: Date.now()
            })
            console.log('[iPhone Upload] 📐 Сжато:', {
              original: `${(file.size / 1024).toFixed(1)}KB`,
              compressed: `${(compressedFile.size / 1024).toFixed(1)}KB`,
              ratio: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
            })
            resolve(compressedFile)
          } else {
            resolve(file) // Fallback к оригиналу
          }
        },
        'image/jpeg',
        0.8 // 80% качество для iPhone
      )
    }
    
    img.onerror = () => resolve(file) // Fallback к оригиналу
    img.src = URL.createObjectURL(file)
  })
}

/**
 * ✅ ЕДИНАЯ функция загрузки логотипов для всех административных страниц
 * АВТОМАТИЧЕСКИ переключается на iPhone-логику при детекции iOS
 */
export async function uploadEntityLogo(
  file: File,
  entityType: 'staff' | 'teams' | 'startups',
  entityId: string
): Promise<UploadLogoResult> {
  // ✅ АВТОМАТИЧЕСКОЕ переключение на iPhone-логику
  if (isiPhone()) {
    return uploadEntityLogoiPhone(file, entityType, entityId)
  }
  
  // ✅ ОРИГИНАЛЬНАЯ логика для всех остальных устройств (БЕЗ ИЗМЕНЕНИЙ)
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