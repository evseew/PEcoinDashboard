import { NextRequest, NextResponse } from 'next/server'
import { serverCache } from '@/lib/server-cache'
import { signedUrlCache } from '@/lib/signed-url-cache'

export async function GET(request: NextRequest) {
  try {
    const stats = serverCache.getStats()
    const signedUrlStats = signedUrlCache.getStats()
    
    // Получаем статистику кэша изображений
    let imageStats = null
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '')
    const imageResponse = await fetch(`${baseUrl}/api/nft-image`, {
        method: 'POST'
      })
      if (imageResponse.ok) {
        const imageData = await imageResponse.json()
        imageStats = imageData.imageCache
      }
    } catch (error) {
      console.error('Error fetching image cache stats:', error)
    }
    
    return NextResponse.json({
      success: true,
      cache: stats,
      signedUrlCache: {
        ...signedUrlStats,
        description: 'Кэш signed URLs для изображений из Supabase Storage'
      },
      imageCache: imageStats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Cache Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pattern = searchParams.get('pattern')
    
    if (pattern) {
      // Инвалидация по паттерну
      const removed = serverCache.invalidate(pattern)
      return NextResponse.json({
        success: true,
        message: `Invalidated ${removed} cache entries`,
        pattern
      })
    } else {
      // Очистка устаревших записей
      const removed = serverCache.cleanup()
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${removed} expired entries`
      })
    }
  } catch (error) {
    console.error('[Cache Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to manage cache' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, type } = body

    switch (action) {
      case 'clear':
        if (type) {
          // Очистка конкретного типа кеша
          const removed = serverCache.invalidate(type)
          console.log(`🧹 Очищен кеш типа ${type}: ${removed} записей`)
          return NextResponse.json({
            success: true,
            message: `Cleared ${removed} ${type} cache entries`,
            removed
          })
        } else {
          // Полная очистка кеша
          const beforeStats = serverCache.getStats()
          serverCache.invalidate('') // Очищает все
          const afterStats = serverCache.getStats()
          
          console.log(`🧹 Полная очистка кеша: ${beforeStats.totalItems} записей`)
          return NextResponse.json({
            success: true,
            message: `Cleared all cache (${beforeStats.totalItems} entries)`,
            before: beforeStats,
            after: afterStats
          })
        }

      case 'cleanup':
        // Очистка устаревших записей
        const cleaned = serverCache.cleanup()
        console.log(`🗑️ Очищено устаревших записей: ${cleaned}`)
        return NextResponse.json({
          success: true,
          message: `Cleaned up ${cleaned} expired entries`,
          cleaned
        })

      case 'gc':
        // Принудительная сборка мусора (если доступна)
        if (global.gc) {
          global.gc()
          console.log(`♻️ Выполнена сборка мусора`)
          return NextResponse.json({
            success: true,
            message: 'Garbage collection executed'
          })
        } else {
          return NextResponse.json({
            success: false,
            message: 'Garbage collection not available (run with --expose-gc)'
          })
        }

      case 'warmup':
        // Предварительный прогрев кеша (будущая функция)
        return NextResponse.json({
          success: true,
          message: 'Cache warmup started (feature not implemented yet)'
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Cache Stats] Error processing action:', error)
    return NextResponse.json(
      { error: 'Failed to process cache action' },
      { status: 500 }
    )
  }
} 