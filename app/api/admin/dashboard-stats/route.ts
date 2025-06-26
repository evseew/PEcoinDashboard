import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"
import { dynamicEcosystemCache } from "@/lib/dynamic-ecosystem-cache"

interface ActivityItem {
  id: string
  time: string
  date: string
  title: string
  description: string
  type: 'team' | 'update' | 'staff' | 'transaction' | 'nft'
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') || 'full' // 'fast' или 'full'
    
    // 1. БЫСТРЫЕ ДАННЫЕ - всегда загружаем первыми (< 100ms)
    const [teamsResult, startupsResult, staffResult] = await Promise.all([
      supabase.from("teams").select("id", { count: 'exact' }),
      supabase.from("startups").select("id", { count: 'exact' }),
      supabase.from("staff").select("id", { count: 'exact' })
    ])

    const quickStats = {
      teams: { count: teamsResult.count || 0, change: 0 },
      startups: { count: startupsResult.count || 0, change: 0 },
      staff: { count: staffResult.count || 0, change: 0 },
      totalPEcoins: { count: 0, change: 0, loading: true } // помечаем как загружается
    }

    // Если быстрый режим - возвращаем только базовые данные
    if (mode === 'fast') {
      return NextResponse.json({
        success: true,
        stats: quickStats,
        recentActivity: [],
        mode: 'fast'
      })
    }

    // 2. МЕДЛЕННЫЕ ДАННЫЕ - балансы PEcoin (могут занять несколько секунд)
    let totalPEcoins = 0
    let balanceLoadingTime = 0
    
    try {
      const balanceStartTime = Date.now()
      
      // Сначала пробуем получить из кэша
      const ecosystemStats = dynamicEcosystemCache.getEcosystemStats()
      
      if (ecosystemStats.totalBalance > 0 && ecosystemStats.cacheAge < 5 * 60 * 1000) {
        // Кэш свежий (< 5 минут) - используем его
        totalPEcoins = ecosystemStats.totalBalance
        console.log('✅ Использованы кэшированные балансы PEcoin')
      } else {
        // Кэш устарел - инициализируем асинхронно, но не блокируем ответ
        console.log('🔄 Запуск фоновой загрузки балансов...')
        
        // Запускаем инициализацию в фоне без await
        dynamicEcosystemCache.autoInitialize().catch(error => {
          console.error('❌ Фоновая инициализация кэша:', error)
        })
        
        // Пытаемся получить балансы напрямую с ограничением по времени
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000) // максимум 3 секунды
          )
          
          const balancePromise = (async () => {
            const [teamsWallets, startupsWallets, staffWallets] = await Promise.all([
              supabase.from("teams").select("wallet_address").not('wallet_address', 'is', null),
              supabase.from("startups").select("wallet_address").not('wallet_address', 'is', null),
              supabase.from("staff").select("wallet_address").not('wallet_address', 'is', null)
            ])
            
            const allWallets = [
              ...(teamsWallets.data?.map(t => t.wallet_address) || []),
              ...(startupsWallets.data?.map(s => s.wallet_address) || []),
              ...(staffWallets.data?.map(st => st.wallet_address) || [])
            ].filter(Boolean)
            
            if (allWallets.length > 0) {
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '')
              const balanceResponse = await fetch(`${baseUrl}/api/token-balances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  wallets: allWallets,
                  mint: "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
                })
              })
              
              if (balanceResponse.ok) {
                const balanceData = await balanceResponse.json()
                if (balanceData.balances) {
                  return Object.values(balanceData.balances).reduce((sum: number, balance: any) => sum + (balance || 0), 0)
                }
              }
            }
            return 0
          })()
          
          totalPEcoins = await Promise.race([balancePromise, timeoutPromise]) as number
          
        } catch (error) {
          console.warn('⚠️ Загрузка балансов заняла слишком много времени, используем кэшированное значение')
          totalPEcoins = ecosystemStats.totalBalance || 0
        }
      }
      
      balanceLoadingTime = Date.now() - balanceStartTime
      
    } catch (error) {
      console.error('❌ Ошибка получения балансов:', error)
      totalPEcoins = 0
    }

    // 3. АКТИВНОСТЬ - тоже получаем быстро
    const [recentTeams, recentStartups, recentStaff] = await Promise.all([
      supabase
        .from("teams")
        .select("id, name, created_at")
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from("startups") 
        .select("id, name, created_at")
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from("staff")
        .select("id, name, created_at")
        .order('created_at', { ascending: false })
        .limit(3)
    ])

    const finalStats = {
      ...quickStats,
      totalPEcoins: { 
        count: totalPEcoins, 
        change: 0,
        loading: false
      }
    }

    // Формируем список недавней активности
    const recentActivity: ActivityItem[] = []
    
    // Добавляем новые команды
    if (recentTeams.data) {
      recentTeams.data.forEach(team => {
        const createdDate = new Date(team.created_at)
        const isToday = createdDate.toDateString() === new Date().toDateString()
        
        recentActivity.push({
          id: `team-${team.id}`,
          time: isToday ? createdDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'Yesterday',
          date: isToday ? 'Today' : createdDate.toLocaleDateString('ru-RU'),
          title: `Новая команда "${team.name}"`,
          description: `Команда "${team.name}" была добавлена в экосистему`,
          type: 'team'
        })
      })
    }

    // Добавляем новые стартапы  
    if (recentStartups.data) {
      recentStartups.data.forEach(startup => {
        const createdDate = new Date(startup.created_at)
        const isToday = createdDate.toDateString() === new Date().toDateString()
        
        recentActivity.push({
          id: `startup-${startup.id}`,
          time: isToday ? createdDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'Yesterday',
          date: isToday ? 'Today' : createdDate.toLocaleDateString('ru-RU'),
          title: `Новый стартап "${startup.name}"`,
          description: `Стартап "${startup.name}" присоединился к экосистеме`,
          type: 'update'
        })
      })
    }

    // Добавляем новых сотрудников
    if (recentStaff.data) {
      recentStaff.data.forEach(staff => {
        const createdDate = new Date(staff.created_at)
        const isToday = createdDate.toDateString() === new Date().toDateString()
        
        recentActivity.push({
          id: `staff-${staff.id}`,
          time: isToday ? createdDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'Yesterday',
          date: isToday ? 'Today' : createdDate.toLocaleDateString('ru-RU'),
          title: `Новый сотрудник "${staff.name}"`,
          description: `Сотрудник "${staff.name}" добавлен в команду`,
          type: 'staff'
        })
      })
    }

    // Сортируем активность по времени (новые сверху)
    recentActivity.sort((a, b) => {
      if (a.date === 'Today' && b.date !== 'Today') return -1
      if (a.date !== 'Today' && b.date === 'Today') return 1
      
      if (a.date === 'Today' && b.date === 'Today') {
        return b.time.localeCompare(a.time)
      }
      
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    console.log('📊 Админ дашборд статистика:', {
      mode,
      teams: finalStats.teams.count,
      startups: finalStats.startups.count, 
      staff: finalStats.staff.count,
      totalPEcoins,
      balanceLoadingTime: `${balanceLoadingTime}ms`,
      recentActivityCount: recentActivity.length
    })

    return NextResponse.json({
      success: true,
      stats: finalStats,
      recentActivity: recentActivity.slice(0, 6), // Берем только последние 6 записей
      mode: 'full',
      timing: {
        balanceLoadingTime
      }
    })

  } catch (error) {
    console.error("❌ Ошибка API админ дашборда:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    )
  }
} 