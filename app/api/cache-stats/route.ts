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
      const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/nft-image`, {
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