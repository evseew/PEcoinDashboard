import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // ✅ ОТКЛЮЧЕНО во всех средах для предотвращения дублирования запросов с PublicDashboard
    return NextResponse.json({
      success: false,
      message: 'Админ инициализация отключена для предотвращения дублирования запросов с PublicDashboard',
      disabled: true,
      recommendation: 'Используйте PublicDashboard и AdminDashboard для загрузки данных'
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