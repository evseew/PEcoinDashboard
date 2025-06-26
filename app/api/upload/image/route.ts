import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const name = formData.get('name') as string
    
    console.log('[Upload Image] Получен запрос на загрузку:', {
      fileName: imageFile?.name,
      fileSize: imageFile?.size,
      customName: name
    })

    // Валидация файла
    if (!imageFile) {
      return NextResponse.json({
        success: false,
        error: 'Файл не предоставлен'
      }, { status: 400 })
    }

    // Проверка типа файла
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'Файл должен быть изображением'
      }, { status: 400 })
    }

    // Проверка размера файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'Размер файла не должен превышать 10MB'
      }, { status: 400 })
    }

    // Проверяем доступность external API
    const externalApiUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_URL
    const externalApiKey = process.env.NEXT_PUBLIC_EXTERNAL_API_KEY

    if (!externalApiUrl || !externalApiKey) {
      console.error('[Upload Image] External API не настроен')
      return NextResponse.json({
        success: false,
        error: 'Сервис загрузки не настроен'
      }, { status: 500 })
    }

    // Готовим форму для отправки на external API
    const externalFormData = new FormData()
    externalFormData.append('image', imageFile)
    if (name) {
      externalFormData.append('name', name)
    }

    console.log('[Upload Image] Отправляем на external API:', externalApiUrl)

    // Отправляем на external API
    const response = await fetch(`${externalApiUrl}/api/upload/image`, {
      method: 'POST',
      headers: {
        'X-API-Key': externalApiKey
      },
      body: externalFormData,
      signal: AbortSignal.timeout(60000) // 60 секунд для больших файлов
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('[Upload Image] External API ошибка:', responseData)
      return NextResponse.json({
        success: false,
        error: responseData.error || 'Ошибка загрузки на сервер'
      }, { status: response.status })
    }

    if (!responseData.success) {
      console.error('[Upload Image] Неуспешный ответ от external API:', responseData)
      return NextResponse.json({
        success: false,
        error: responseData.error || 'Не удалось загрузить изображение'
      }, { status: 500 })
    }

    console.log('[Upload Image] ✅ Успешно загружено:', {
      ipfsHash: responseData.data?.ipfsHash,
      gatewayUrl: responseData.data?.gatewayUrl
    })

    // Возвращаем результат
    return NextResponse.json({
      success: true,
      data: {
        ipfsHash: responseData.data.ipfsHash,
        ipfsUri: responseData.data.ipfsUri,
        gatewayUrl: responseData.data.gatewayUrl,
        size: responseData.data.size,
        originalName: imageFile.name,
        uploadedName: responseData.data.name || name || imageFile.name
      }
    })

  } catch (error: any) {
    console.error('[Upload Image] Критическая ошибка:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при загрузке изображения',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'Метод GET не поддерживается. Используйте POST для загрузки изображений.'
  }, { status: 405 })
} 