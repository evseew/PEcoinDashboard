import { NextRequest, NextResponse } from 'next/server'
import { serverCache } from '@/lib/server-cache'

// Кэш для изображений в памяти (для небольших изображений)
const imageCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>()
const IMAGE_CACHE_TTL = 60 * 60 * 1000 // 1 час

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    // Валидация URL
    try {
      new URL(imageUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      )
    }

    console.log(`[Image Proxy] Запрос изображения: ${imageUrl}`)

    // Проверяем кэш в памяти
    const cached = imageCache.get(imageUrl)
    if (cached && (Date.now() - cached.timestamp) < IMAGE_CACHE_TTL) {
      console.log(`🎯 Image Cache HIT: ${imageUrl}`)
      
      return new NextResponse(cached.data, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=3600', // 1 час в браузере
          'X-Cache-Status': 'HIT'
        }
      })
    }

    // Загружаем изображение
    console.log(`🔄 Image Cache MISS: ${imageUrl} - fetching`)
    
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'PEcoin-Dashboard/1.0',
      },
      // Таймаут для изображений
      signal: AbortSignal.timeout(15000)
    })

    if (!imageResponse.ok) {
      throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`)
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    
    // Проверяем, что это действительно изображение
    if (!contentType.startsWith('image/')) {
      throw new Error(`Not an image: ${contentType}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const buffer = Buffer.from(imageBuffer)
    
    // Кэшируем только небольшие изображения (< 2MB)
    if (buffer.length < 2 * 1024 * 1024) {
      imageCache.set(imageUrl, {
        data: buffer,
        contentType,
        timestamp: Date.now()
      })
      
      // Ограничиваем размер кэша (максимум 100 изображений)
      if (imageCache.size > 100) {
        const oldestEntry = imageCache.keys().next()
        if (oldestEntry.value) {
          imageCache.delete(oldestEntry.value)
        }
      }
    }

    console.log(`✅ Image loaded: ${imageUrl} (${buffer.length} bytes)`)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // 1 час в браузере
        'X-Cache-Status': 'MISS',
        'Content-Length': buffer.length.toString()
      }
    })

  } catch (error) {
    console.error('[Image Proxy] Error:', error)
    
    // Возвращаем placeholder при ошибке
    return NextResponse.redirect('/images/nft-placeholder.png')
  }
}

// Статистика кэша изображений
export async function POST(request: NextRequest) {
  try {
    const now = Date.now()
    const stats = {
      totalImages: imageCache.size,
      totalSize: Array.from(imageCache.values()).reduce((sum, item) => sum + item.data.length, 0),
      avgAge: imageCache.size > 0 
        ? Math.round(Array.from(imageCache.values()).reduce((sum, item) => sum + (now - item.timestamp), 0) / imageCache.size / 1000)
        : 0
    }
    
    return NextResponse.json({
      success: true,
      imageCache: stats
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get image cache stats' },
      { status: 500 }
    )
  }
} 