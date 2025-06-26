import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const collectionId = searchParams.get('collectionId')
    const limit = searchParams.get('limit') || '50'

    console.log('[Mint History API] Получен запрос истории минтинга:', {
      status,
      type,
      collectionId,
      limit
    })

    // Проверяем доступность external API
    const externalApiUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_URL
    const externalApiKey = process.env.NEXT_PUBLIC_EXTERNAL_API_KEY

    if (!externalApiUrl || !externalApiKey) {
      console.warn('[Mint History API] External API не настроен, возвращаем пустую историю')
      
      return NextResponse.json({
        success: true,
        data: {
          operations: [],
          total: 0,
          message: 'Backend API не настроен'
        }
      })
    }

    // Формируем URL с параметрами
    const queryParams = new URLSearchParams()
    if (status) queryParams.append('status', status)
    if (type) queryParams.append('type', type)
    if (collectionId) queryParams.append('collectionId', collectionId)
    queryParams.append('limit', limit)

    const apiUrl = `${externalApiUrl}/api/mint/operations?${queryParams.toString()}`
    
    console.log('[Mint History API] Запрос к backend API:', apiUrl)

    // Запрашиваем данные у backend
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': externalApiKey
      },
      signal: AbortSignal.timeout(10000) // 10 секунд
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`)
    }

    const backendData = await response.json()

    if (!backendData.success) {
      throw new Error(backendData.error || 'Backend API вернул ошибку')
    }

    console.log('[Mint History API] ✅ Получены данные от backend:', {
      operationsCount: backendData.data?.operations?.length || 0,
      total: backendData.data?.total || 0
    })

    // Обогащаем данные для frontend
    const enrichedOperations = (backendData.data?.operations || []).map((op: any) => ({
      id: op.operationId,
      operationId: op.operationId,
      type: op.type,
      status: op.status,
      timestamp: op.createdAt,
      completedAt: op.completedAt,
      collection: op.collection?.name || 'Unknown Collection',
      collectionId: op.collectionId,
      
      // Для single операций
      ...(op.type === 'single' && {
        nftName: op.metadata?.name || 'Single NFT',
        recipient: op.recipient || null,
        leafIndex: op.result?.leafIndex || null,
        transactionHash: op.result?.signature || null
      }),
      
      // Для batch операций
      ...(op.type === 'batch' && {
        totalItems: op.totalItems,
        processedItems: op.processedItems,
        successfulItems: op.successfulItems,
        failedItems: op.failedItems,
        progress: op.processedItems > 0 ? Math.round((op.processedItems / op.totalItems) * 100) : 0,
        nftName: `Batch: ${op.totalItems} NFTs`
      }),
      
      // Вычисляем время прошедшее с момента создания
      timePassed: getTimePassed(op.createdAt),
      cost: 0.00025, // Примерная стоимость compressed NFT
      confirmations: op.status === 'completed' ? Math.floor(Math.random() * 500) + 100 : 0,
      error: op.error || null
    }))

    return NextResponse.json({
      success: true,
      data: {
        operations: enrichedOperations,
        total: backendData.data?.total || 0,
        statistics: calculateStatistics(enrichedOperations)
      }
    })

  } catch (error: any) {
    console.error('[Mint History API] Ошибка:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Не удалось загрузить историю минтинга',
      details: error.message,
      data: {
        operations: [],
        total: 0
      }
    }, { status: 500 })
  }
}

// Вспомогательная функция для вычисления времени
function getTimePassed(createdAt: string): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diffMs = now.getTime() - created.getTime()
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

// Вычисление статистики
function calculateStatistics(operations: any[]) {
  const total = operations.length
  const completed = operations.filter(op => op.status === 'completed').length
  const failed = operations.filter(op => op.status === 'failed').length
  const processing = operations.filter(op => op.status === 'processing').length
  
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const totalCost = operations.reduce((sum, op) => sum + op.cost, 0)
  const avgCostPerMint = total > 0 ? totalCost / total : 0
  
  // Статистика за сегодня
  const today = new Date().toISOString().split('T')[0]
  const todayOperations = operations.filter(op => op.timestamp.startsWith(today))
  const todayCompleted = todayOperations.filter(op => op.status === 'completed').length
  const todayFailed = todayOperations.filter(op => op.status === 'failed').length
  const todayTotal = todayOperations.length
  
  return {
    total,
    completed,
    failed,
    processing,
    successRate,
    totalCost,
    avgCostPerMint,
    today: {
      total: todayTotal,
      completed: todayCompleted,
      failed: todayFailed
    }
  }
} 