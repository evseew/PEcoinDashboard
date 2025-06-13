import { NextRequest, NextResponse } from "next/server"
import { dynamicEcosystemCache } from "@/lib/dynamic-ecosystem-cache"

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Принудительная инициализация экосистемы через админ API...')
    
    // Принудительная инициализация
    await dynamicEcosystemCache.autoInitialize()
    
    // Получаем статистику после инициализации
    const stats = dynamicEcosystemCache.getEcosystemStats()
    
    console.log('✅ Экосистема инициализирована:', stats)
    
    return NextResponse.json({
      success: true,
      message: 'Экосистема успешно инициализирована',
      stats
    })

  } catch (error) {
    console.error('❌ Ошибка инициализации экосистемы:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка инициализации экосистемы',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 