import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { metadata, filename } = await request.json()
    
    console.log('[Upload Metadata] Получен запрос на загрузку метаданных:', {
      hasMetadata: !!metadata,
      filename,
      metadataKeys: metadata ? Object.keys(metadata) : []
    })

    // Валидация метаданных
    if (!metadata) {
      return NextResponse.json({
        success: false,
        error: 'Метаданные не предоставлены'
      }, { status: 400 })
    }

    // Базовая валидация структуры NFT метаданных
    if (!metadata.name || !metadata.image) {
      return NextResponse.json({
        success: false,
        error: 'Метаданные должны содержать name и image'
      }, { status: 400 })
    }

    // Проверяем доступность external API
    const externalApiUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_URL
    const externalApiKey = process.env.NEXT_PUBLIC_EXTERNAL_API_KEY

    if (!externalApiUrl || !externalApiKey) {
      console.error('[Upload Metadata] External API не настроен')
      return NextResponse.json({
        success: false,
        error: 'Сервис загрузки метаданных не настроен'
      }, { status: 500 })
    }

    console.log('[Upload Metadata] Отправляем на external API:', externalApiUrl)

    // Отправляем на external API
    const response = await fetch(`${externalApiUrl}/api/upload/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': externalApiKey
      },
      body: JSON.stringify({
        metadata,
        filename
      }),
      signal: AbortSignal.timeout(30000) // 30 секунд
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('[Upload Metadata] External API ошибка:', responseData)
      return NextResponse.json({
        success: false,
        error: responseData.error || 'Ошибка загрузки метаданных на сервер'
      }, { status: response.status })
    }

    if (!responseData.success) {
      console.error('[Upload Metadata] Неуспешный ответ от external API:', responseData)
      return NextResponse.json({
        success: false,
        error: responseData.error || 'Не удалось загрузить метаданные'
      }, { status: 500 })
    }

    console.log('[Upload Metadata] ✅ Метаданные успешно загружены:', {
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
        filename: responseData.data.filename || filename,
        metadata: metadata
      }
    })

  } catch (error: any) {
    console.error('[Upload Metadata] Критическая ошибка:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при загрузке метаданных',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'Метод GET не поддерживается. Используйте POST для загрузки метаданных.'
  }, { status: 405 })
} 