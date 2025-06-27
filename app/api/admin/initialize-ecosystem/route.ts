import { NextRequest, NextResponse } from "next/server"
import { dynamicEcosystemCache } from "@/lib/dynamic-ecosystem-cache"

export async function POST(request: NextRequest) {
  try {
    // ОТКЛЮЧЕНО для production - дублирует запросы балансов с PublicDashboard
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        message: 'Админ инициализация отключена для production окружения (предотвращение дублирования запросов)',
        productionMode: true
      })
    }

    console.log('🔄 Принудительная инициализация экосистемы через админ API... (development)')
    
    // Принудительная инициализация (только для development)
    await dynamicEcosystemCache.autoInitialize()
    
    // Получаем статистику после инициализации
    const stats = dynamicEcosystemCache.getEcosystemStats()
    
    console.log('✅ Экосистема инициализирована:', stats)
    
    return NextResponse.json({
      success: true,
      message: 'Экосистема успешно инициализирована (development mode)',
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