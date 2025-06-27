// Автоматическая инициализация динамического кэширования экосистемы
import { NextRequest, NextResponse } from "next/server"
import { dynamicEcosystemCache } from "@/lib/dynamic-ecosystem-cache"

let isInitialized = false
let isInitializing = false

export async function POST(request: NextRequest) {
  try {
    // ОТКЛЮЧЕНО для production - дублирует запросы балансов с PublicDashboard
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        success: false, 
        message: 'Ecosystem initialization disabled for production environment to prevent duplicate balance requests',
        productionMode: true
      })
    }

    if (isInitialized) {
      const stats = dynamicEcosystemCache.getEcosystemStats()
      return NextResponse.json({ 
        success: true, 
        message: 'Already initialized',
        stats,
        alreadyInitialized: true
      })
    }

    if (isInitializing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Initialization in progress',
        initializing: true
      })
    }

    isInitializing = true
    console.log('🌐 Запуск автоматической инициализации динамической экосистемы... (development)')

    // Инициализация в фоновом режиме (только для development)
    dynamicEcosystemCache.autoInitialize()
      .then(() => {
        isInitialized = true
        isInitializing = false
        console.log('✅ Динамическая экосистема успешно инициализирована')
      })
      .catch((error) => {
        isInitializing = false
        console.error('❌ Ошибка инициализации динамической экосистемы:', error)
      })

    return NextResponse.json({ 
      success: true, 
      message: 'Dynamic ecosystem initialization started (development mode)',
      initializing: true
    })

  } catch (error) {
    isInitializing = false
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
      initialized: isInitialized,
      initializing: isInitializing,
      productionMode: process.env.NODE_ENV === 'production'
    },
    stats: isInitialized ? dynamicEcosystemCache.getEcosystemStats() : null
  })
} 