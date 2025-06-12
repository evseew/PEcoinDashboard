import { NextRequest, NextResponse } from 'next/server'
import { signedUrlCache } from '@/lib/signed-url-cache'

export async function GET(request: NextRequest) {
  try {
    const stats = signedUrlCache.getStats()
    
    return NextResponse.json({
      success: true,
      signedUrlCache: {
        ...stats,
        description: 'Кэш signed URLs для изображений из Supabase Storage'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Signed URL Cache Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get signed URL cache stats' },
      { status: 500 }
    )
  }
}

// Очистка кэша (только для разработки)
export async function DELETE(request: NextRequest) {
  try {
    signedUrlCache.clear()
    
    return NextResponse.json({
      success: true,
      message: 'Signed URL cache cleared successfully'
    })
  } catch (error) {
    console.error('[Signed URL Cache Clear API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to clear signed URL cache' },
      { status: 500 }
    )
  }
} 