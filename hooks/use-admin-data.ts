import { useState, useEffect, useRef } from "react"

// Кэш для данных админ панели с TTL (глобальный)
if (typeof globalThis !== 'undefined' && !globalThis.adminCacheMap) {
  globalThis.adminCacheMap = new Map<string, { data: any; timestamp: number }>()
}
const adminCache = globalThis.adminCacheMap || new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 минуты

// Хук для дашборда админа с быстрой загрузкой
export function useAdminDashboard() {
  const [stats, setStats] = useState({
    teams: { count: 0, change: 0 },
    startups: { count: 0, change: 0 },
    staff: { count: 0, change: 0 },
    totalPEcoins: { count: 0, change: 0, loading: true },
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedRef = useRef(false)

  const fetchDashboardData = async (mode: 'fast' | 'full' = 'fast') => {
    const cacheKey = `admin-dashboard-stats-${mode}`
    
    // Для быстрого режима всегда делаем запрос (данные небольшие)
    if (mode === 'fast') {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/admin/dashboard-stats?mode=fast')
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить статистику дашборда')
        }

        const data = await response.json()
        
        if (data.success) {
          setStats(data.stats)
          setIsLoading(false)
          
          // Сразу после быстрой загрузки запускаем полную
          if (!loadedRef.current) {
            loadedRef.current = true
            setTimeout(() => fetchFullData(), 100)
          }
        } else {
          throw new Error(data.error || 'Ошибка получения данных')
        }
      } catch (error) {
        console.error("Ошибка быстрой загрузки данных дашборда:", error)
        setError(error instanceof Error ? error.message : 'Произошла ошибка')
        setIsLoading(false)
        
        // Показываем базовую структуру
        setStats({
          teams: { count: 0, change: 0 },
          startups: { count: 0, change: 0 },
          staff: { count: 0, change: 0 },
          totalPEcoins: { count: 0, change: 0, loading: true },
        })
      }
      return
    }

    // Полная загрузка с кэшированием
    await fetchFullData()
  }

  const fetchFullData = async () => {
    const cacheKey = 'admin-dashboard-stats-full'
    
    // Проверяем кэш для полных данных
    const cached = adminCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setStats(cached.data.stats)
      setRecentActivity(cached.data.recentActivity || [])
      setBalancesLoading(false)
      return
    }

    setBalancesLoading(true)
    
    try {
      const response = await fetch('/api/admin/dashboard-stats?mode=full')
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить полную статистику дашборда')
      }

      const data = await response.json()
      
      if (data.success) {
        // Кэшируем данные
        adminCache.set(cacheKey, { 
          data: { stats: data.stats, recentActivity: data.recentActivity }, 
          timestamp: Date.now() 
        })
        
        setStats(data.stats)
        setRecentActivity(data.recentActivity || [])
        
        console.log(`✅ Полные данные загружены за ${data.timing?.balanceLoadingTime || 'н/д'}ms`)
      } else {
        throw new Error(data.error || 'Ошибка получения данных')
      }
    } catch (error) {
      console.error("Ошибка полной загрузки данных дашборда:", error)
      // Не показываем ошибку если уже есть базовые данные
      if (stats.teams.count === 0) {
        setError(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    } finally {
      setBalancesLoading(false)
    }
  }

  const invalidateCache = () => {
    adminCache.delete('admin-dashboard-stats-fast')
    adminCache.delete('admin-dashboard-stats-full')
    loadedRef.current = false
  }

  const refetch = () => {
    loadedRef.current = false
    setBalancesLoading(true)
    fetchDashboardData('fast')
  }

  useEffect(() => {
    fetchDashboardData('fast')
  }, [])

  return { 
    stats, 
    recentActivity, 
    isLoading, 
    balancesLoading,
    error, 
    refetch,
    invalidateCache 
  }
}

// Хук для списка команд
export function useAdminTeams() {
  const [teams, setTeams] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeams = async () => {
    const cacheKey = 'admin-teams'
    
    // Проверяем кэш
    const cached = adminCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setTeams(cached.data)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const { supabase } = await import("@/lib/supabaseClient")
      const { data, error } = await supabase.from("teams").select("*")
      
      if (error) throw error
      
      const teamsData = (data || []).map(team => ({
        ...team,
        achievements: team.achievements || 0,
        age_range_min: team.age_range_min,
        age_range_max: team.age_range_max,
        age_display: team.age_display
      }))
      
      // Кэшируем данные
      adminCache.set(cacheKey, { data: teamsData, timestamp: Date.now() })
      setTeams(teamsData)
    } catch (err: any) {
      console.error("Ошибка загрузки команд:", err)
      setError(err.message || "Ошибка загрузки команд")
    } finally {
      setIsLoading(false)
    }
  }

  const invalidateCache = () => {
    adminCache.delete('admin-teams')
    adminCache.delete('admin-dashboard-stats') // Инвалидируем также дашборд
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  return { 
    teams, 
    isLoading, 
    error, 
    refetch: fetchTeams,
    invalidateCache 
  }
}

// Хук для списка стартапов
export function useAdminStartups() {
  const [startups, setStartups] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStartups = async () => {
    const cacheKey = 'admin-startups'
    
    // Проверяем кэш
    const cached = adminCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setStartups(cached.data)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const { supabase } = await import("@/lib/supabaseClient")
      const { data, error } = await supabase.from("startups").select("*")
      
      if (error) throw error
      
      const startupsData = (data || []).map((startup: any) => ({
        id: startup.id,
        name: startup.name,
        walletAddress: startup.wallet_address,
        logo: startup.logo_url,
        description: startup.description,
        achievements: startup.achievements || 0,
        balance: 0,
        age_range_min: startup.age_range_min,
        age_range_max: startup.age_range_max,
        age_display: startup.age_display,
      }))
      
      // Кэшируем данные
      adminCache.set(cacheKey, { data: startupsData, timestamp: Date.now() })
      setStartups(startupsData)
    } catch (err: any) {
      console.error("Ошибка загрузки стартапов:", err)
      setError(err.message || "Ошибка загрузки стартапов")
    } finally {
      setIsLoading(false)
    }
  }

  const invalidateCache = () => {
    adminCache.delete('admin-startups')
    adminCache.delete('admin-dashboard-stats') // Инвалидируем также дашборд
  }

  useEffect(() => {
    fetchStartups()
  }, [])

  return { 
    startups, 
    isLoading, 
    error, 
    refetch: fetchStartups,
    invalidateCache 
  }
}

// Хук для списка сотрудников
export function useAdminStaff() {
  const [staff, setStaff] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaff = async () => {
    const cacheKey = 'admin-staff'
    
    // Проверяем кэш
    const cached = adminCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setStaff(cached.data)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const { supabase } = await import("@/lib/supabaseClient")
      const { data, error } = await supabase.from("staff").select("*")
      
      if (error) throw error
      
      const staffData = (data || []).map(member => ({
        ...member,
        achievements: member.achievements || 0
      }))
      
      // Кэшируем данные
      adminCache.set(cacheKey, { data: staffData, timestamp: Date.now() })
      setStaff(staffData)
    } catch (err: any) {
      console.error("Ошибка загрузки сотрудников:", err)
      setError(err.message || "Ошибка загрузки сотрудников")
    } finally {
      setIsLoading(false)
    }
  }

  const invalidateCache = () => {
    adminCache.delete('admin-staff')
    adminCache.delete('admin-dashboard-stats') // Инвалидируем также дашборд
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  return { 
    staff, 
    isLoading, 
    error, 
    refetch: fetchStaff,
    invalidateCache 
  }
}

// Утилиты для работы с кэшем
export const adminCacheUtils = {
  // Очистить весь кэш админки
  clearAll: () => {
    const keys = Array.from(adminCache.keys()).filter(key => key.startsWith('admin-'))
    keys.forEach(key => adminCache.delete(key))
  },
  
  // Получить статистику кэша
  getStats: () => {
    const adminKeys = Array.from(adminCache.keys()).filter(key => key.startsWith('admin-'))
    const now = Date.now()
    
    return {
      totalEntries: adminKeys.length,
      validEntries: adminKeys.filter(key => {
        const cached = adminCache.get(key)
        return cached && (now - cached.timestamp) < CACHE_TTL
      }).length,
      cacheHitRate: adminKeys.length > 0 ? 
        (adminKeys.filter(key => {
          const cached = adminCache.get(key)
          return cached && (now - cached.timestamp) < CACHE_TTL
        }).length / adminKeys.length) * 100 : 0
    }
  }
} 