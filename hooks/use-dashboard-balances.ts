import { useState, useEffect, useCallback } from 'react'
import { precomputeATAs } from '@/lib/ata-cache'

interface DashboardBalancesState {
  balances: Record<string, number>
  totalTeamCoins: number
  totalStartupCoins: number  
  totalCoins: number
  isLoading: boolean
  isStale: boolean // Данные устарели и обновляются в фоне
  error: string | null
  lastUpdated: number | null
}

interface DashboardBalancesOptions {
  teams: any[]
  startups: any[]
  pecoinMint: string
  autoRefreshInterval?: number // В миллисекундах
}

// ✅ Глобальный кэш для optimistic UI между компонентами
export const globalBalanceCache = {
  balances: {} as Record<string, number>,
  totalCoins: 0,
  timestamp: 0,
  TTL: 2 * 60 * 1000 // ✅ УМЕНЬШЕНО до 2 минут согласно плану оптимизации
}

export function useDashboardBalances(options: DashboardBalancesOptions) {
  const { teams, startups, pecoinMint, autoRefreshInterval = 5 * 60 * 1000 } = options
  
  const [state, setState] = useState<DashboardBalancesState>({
    balances: globalBalanceCache.balances,
    totalTeamCoins: 0,
    totalStartupCoins: 0,
    totalCoins: globalBalanceCache.totalCoins,
    isLoading: false,
    isStale: false,
    error: null,
    lastUpdated: globalBalanceCache.timestamp || null
  })

  // ✅ Функция загрузки балансов
  const fetchBalances = useCallback(async (showAsStale = false) => {
    const teamWallets = teams.filter(team => team.wallet_address).map(team => team.wallet_address)
    const startupWallets = startups.filter(startup => startup.wallet_address).map(startup => startup.wallet_address)
    const allWallets = [...new Set([...teamWallets, ...startupWallets])]
    
    if (allWallets.length === 0) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStale: false,
        balances: {},
        totalTeamCoins: 0,
        totalStartupCoins: 0,
        totalCoins: 0
      }))
      return
    }
    
    try {
      setState(prev => ({ ...prev, isLoading: !showAsStale, isStale: showAsStale, error: null }))
      
      const startTime = Date.now()
      console.log(`[useDashboardBalances] 🚀 Загружаю балансы для ${allWallets.length} кошельков${showAsStale ? ' (фоновое обновление)' : ''}`)
      
      // ✅ ИСПРАВЛЕНО: Предвычисляем ATA адреса только на клиенте
      if (typeof window !== 'undefined') {
        try {
          await precomputeATAs(pecoinMint, allWallets)
        } catch (error) {
          console.warn('[useDashboardBalances] ⚠️ Ошибка предвычисления ATA:', error)
          // Продолжаем без предвычисления ATA
        }
      }
      
      const response = await fetch('/api/token-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          wallets: allWallets,
          mint: pecoinMint 
        }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      const balancesData = data.balances || {}
      
      // Подсчитываем суммы
      let teamSum = 0
      let startupSum = 0
      
      teams.forEach(team => {
        if (team.wallet_address) {
          const balance = balancesData[team.wallet_address] || 0
          teamSum += balance
        }
      })
      
      startups.forEach(startup => {
        if (startup.wallet_address) {
          const balance = balancesData[startup.wallet_address] || 0
          startupSum += balance
        }
      })
      
      const totalCoins = teamSum + startupSum
      const now = Date.now()
      
      // ✅ Обновляем глобальный кэш
      globalBalanceCache.balances = balancesData
      globalBalanceCache.totalCoins = totalCoins
      globalBalanceCache.timestamp = now
      
      setState(prev => ({
        ...prev,
        balances: balancesData,
        totalTeamCoins: teamSum,
        totalStartupCoins: startupSum,
        totalCoins,
        isLoading: false,
        isStale: false,
        error: null,
        lastUpdated: now
      }))
      
      const loadTime = Date.now() - startTime
      console.log(`[useDashboardBalances] ✅ Балансы загружены за ${loadTime}ms: ${totalCoins} PEcoin (команды: ${teamSum}, стартапы: ${startupSum})`)
      
    } catch (error) {
      console.error('[useDashboardBalances] ❌ Ошибка загрузки балансов:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStale: false,
        error: error instanceof Error ? error.message : 'Ошибка загрузки балансов'
      }))
    }
  }, [teams, startups, pecoinMint])

  // ✅ Первоначальная загрузка (только на клиенте)
  useEffect(() => {
    // ✅ Проверяем, что мы на клиенте
    if (typeof window === 'undefined') {
      return
    }

    // Проверяем кэш - если данные свежие, используем их
    const isCacheValid = globalBalanceCache.timestamp && 
      (Date.now() - globalBalanceCache.timestamp) < globalBalanceCache.TTL
    
    if (isCacheValid) {
      console.log(`[useDashboardBalances] 💾 Используем кэшированные балансы (возраст: ${Math.round((Date.now() - globalBalanceCache.timestamp) / 1000)}s)`)
      
      // Показываем кэшированные данные сразу
      setState(prev => ({
        ...prev,
        balances: globalBalanceCache.balances,
        totalCoins: globalBalanceCache.totalCoins,
        lastUpdated: globalBalanceCache.timestamp,
        isLoading: false
      }))
      
      // Обновляем в фоне
      setTimeout(() => {
        fetchBalances(true) // showAsStale = true
      }, 100)
    } else {
      // Кэш пустой или устарел - загружаем сразу
      fetchBalances(false)
    }
  }, [fetchBalances])

  // ✅ Автообновление (только на клиенте)
  useEffect(() => {
    if (typeof window === 'undefined' || !autoRefreshInterval) {
      return
    }
    
    const interval = setInterval(() => {
      console.log(`[useDashboardBalances] 🔄 Автообновление балансов через ${autoRefreshInterval}ms`)
      fetchBalances(true) // Фоновое обновление
    }, autoRefreshInterval)
    
    return () => clearInterval(interval)
  }, [fetchBalances, autoRefreshInterval])

  // ✅ Функция для ручного обновления
  const refresh = useCallback(() => {
    fetchBalances(false)
  }, [fetchBalances])

  return {
    ...state,
    refresh
  }
} 