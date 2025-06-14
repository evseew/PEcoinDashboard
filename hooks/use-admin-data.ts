import { useState, useEffect, useRef } from "react"

// Кэш для данных админ панели с TTL (глобальный)
if (typeof globalThis !== 'undefined' && !globalThis.adminCacheMap) {
  globalThis.adminCacheMap = new Map<string, { data: any; timestamp: number }>()
}
const adminCache = globalThis.adminCacheMap || new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 минуты

// Хук для дашборда админа
export function useAdminDashboard() {
  const [stats, setStats] = useState({
    teams: { count: 0, change: 0 },
    startups: { count: 0, change: 0 },
    staff: { count: 0, change: 0 },
    totalPEcoins: { count: 0, change: 0 },
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    const cacheKey = 'admin-dashboard-stats'
    
    // Проверяем кэш
    const cached = adminCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setStats(cached.data.stats)
      setRecentActivity(cached.data.recentActivity || [])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/dashboard-stats')
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить статистику дашборда')
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
      } else {
        throw new Error(data.error || 'Ошибка получения данных')
      }
    } catch (error) {
      console.error("Ошибка загрузки данных дашборда:", error)
      setError(error instanceof Error ? error.message : 'Произошла ошибка')
      setStats({
        teams: { count: 0, change: 0 },
        startups: { count: 0, change: 0 },
        staff: { count: 0, change: 0 },
        totalPEcoins: { count: 0, change: 0 },
      })
      setRecentActivity([])
    } finally {
      setIsLoading(false)
    }
  }

  const invalidateCache = () => {
    adminCache.delete('admin-dashboard-stats')
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return { 
    stats, 
    recentActivity, 
    isLoading, 
    error, 
    refetch: fetchDashboardData,
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
        achievements: team.achievements || 0
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