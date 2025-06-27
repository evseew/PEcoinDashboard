// API для управления динамическим глобальным кэшированием экосистемы
import { NextRequest, NextResponse } from "next/server"
import { dynamicEcosystemCache } from "@/lib/dynamic-ecosystem-cache"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const walletAddress = searchParams.get('wallet')

  try {
    switch (action) {
      case 'stats':
        // Получить статистику экосистемы
        const stats = dynamicEcosystemCache.getEcosystemStats()
        return NextResponse.json({ success: true, stats })

      case 'participant':
        // Получить данные конкретного участника
        if (!walletAddress) {
          return NextResponse.json({ 
            success: false, 
            error: 'Wallet address required' 
          }, { status: 400 })
        }
        
        const participantData = dynamicEcosystemCache.getParticipantData(walletAddress)
        return NextResponse.json({ 
          success: true, 
          data: participantData 
        })

      case 'participants':
        // Получить список всех участников с балансами (устраняем дублирование запросов)
        const participantsWithBalances = dynamicEcosystemCache.getAllParticipantsWithBalances()
        return NextResponse.json({ 
          success: true, 
          participants: participantsWithBalances 
        })

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ Dynamic ecosystem API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, walletAddress } = body

    switch (action) {
      case 'initialize':
        // ОТКЛЮЧЕНО для production - дублирует запросы балансов с PublicDashboard
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json({ 
            success: false, 
            message: 'Ecosystem initialization disabled for production environment to prevent duplicate balance requests',
            productionMode: true
          })
        }
        
        // Автоматическая инициализация экосистемы (только для development)
        await dynamicEcosystemCache.autoInitialize()
        const initStats = dynamicEcosystemCache.getEcosystemStats()
        
        return NextResponse.json({ 
          success: true, 
          message: 'Dynamic ecosystem initialized (development mode)',
          stats: initStats
        })

      case 'refresh':
        if (walletAddress) {
          // Обновить данные конкретного участника
          await dynamicEcosystemCache.refreshParticipant(walletAddress)
          const participantData = dynamicEcosystemCache.getParticipantData(walletAddress)
          
          return NextResponse.json({ 
            success: true, 
            message: 'Participant refreshed',
            data: participantData
          })
        } else {
          // Полное обновление экосистемы
          await dynamicEcosystemCache.refreshAllData()
          const refreshStats = dynamicEcosystemCache.getEcosystemStats()
          
          return NextResponse.json({ 
            success: true, 
            message: 'Ecosystem refreshed',
            stats: refreshStats
          })
        }

      case 'refresh-participants':
        // Обновить только список участников
        await dynamicEcosystemCache.refreshParticipants()
        const participantsStats = dynamicEcosystemCache.getEcosystemStats()
        
        return NextResponse.json({ 
          success: true, 
          message: 'Participants list refreshed',
          stats: participantsStats
        })

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ Dynamic ecosystem POST error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 