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
    // Получаем основную статистику из базы данных
    const [teamsResult, startupsResult, staffResult] = await Promise.all([
      supabase.from("teams").select("id", { count: 'exact' }),
      supabase.from("startups").select("id", { count: 'exact' }),
      supabase.from("staff").select("id", { count: 'exact' })
    ])

    // Получаем статистику PEcoins из динамического кэша
    // Проверяем, инициализирован ли кэш, если нет - инициализируем
    const ecosystemStats = dynamicEcosystemCache.getEcosystemStats()
    
    // Если кэш пустой или устарел, пытаемся его инициализировать
    let finalEcosystemStats = ecosystemStats
    if (ecosystemStats.totalParticipants === 0 || ecosystemStats.cacheAge > 30 * 60 * 1000) {
      try {
        console.log('🔄 Инициализация кэша экосистемы для админ дашборда...')
        await dynamicEcosystemCache.autoInitialize()
        // Получаем обновленную статистику после инициализации
        finalEcosystemStats = dynamicEcosystemCache.getEcosystemStats()
      } catch (error) {
        console.error('❌ Ошибка инициализации кэша:', error)
      }
    }
    
    // Собираем данные о недавней активности (последние записи из каждой таблицы)
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

    // Если кэш не дал результатов, попробуем получить сумму балансов напрямую
    let totalPEcoins = finalEcosystemStats.totalBalance || 0
    
    if (totalPEcoins === 0) {
      try {
        // Получаем все кошельки из базы данных
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
          // Запрашиваем балансы через API
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
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
              totalPEcoins = Object.values(balanceData.balances).reduce((sum: number, balance: any) => sum + (balance || 0), 0)
            }
          }
        }
      } catch (error) {
        console.error('❌ Ошибка получения балансов:', error)
      }
    }

    // Формируем статистику с изменениями (пока что 0, можно добавить логику подсчета изменений за период)
    const stats = {
      teams: { 
        count: teamsResult.count || 0, 
        change: 0 // TODO: добавить подсчет изменений за последний период
      },
      startups: { 
        count: startupsResult.count || 0, 
        change: 0 
      },
      staff: { 
        count: staffResult.count || 0, 
        change: 0 
      },
      totalPEcoins: { 
        count: totalPEcoins, 
        change: 0 
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
      teams: stats.teams.count,
      startups: stats.startups.count, 
      staff: stats.staff.count,
      totalPEcoins,
      ecosystemCacheStats: finalEcosystemStats,
      recentActivityCount: recentActivity.length
    })

    return NextResponse.json({
      success: true,
      stats,
      recentActivity: recentActivity.slice(0, 6) // Берем только последние 6 записей
    })

  } catch (error) {
    console.error('❌ Admin dashboard stats API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    }, { status: 500 })
  }
} 