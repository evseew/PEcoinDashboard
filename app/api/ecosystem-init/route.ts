// Автоматическая инициализация динамического кэширования экосистемы
import { NextRequest, NextResponse } from "next/server"

let isInitialized = false
let isInitializing = false

export async function POST(request: NextRequest) {
  try {
    // ✅ ОТКЛЮЧЕНО во всех средах для предотвращения дублирования запросов с PublicDashboard
    return NextResponse.json({ 
      success: false, 
      message: 'Ecosystem initialization disabled to prevent duplicate requests with PublicDashboard',
      disabled: true,
      recommendation: 'Use PublicDashboard for data loading'
    })

  } catch (error) {
    console.error('❌ Ecosystem init error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to initialize ecosystem' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    status: {
      initialized: false,
      initializing: false,
      disabled: true,
      message: 'DynamicEcosystemCache полностью отключен'
    },
    stats: null
  })
} 