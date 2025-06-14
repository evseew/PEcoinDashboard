import { useState } from "react"
import { v4 as uuidv4 } from "uuid"

// Типы для оптимистичных обновлений
interface OptimisticUpdate<T> {
  tempId: string
  operation: 'create' | 'update' | 'delete'
  data: T
  originalData?: T
}

// Кэш для оптимистичных обновлений
const optimisticUpdatesCache = new Map<string, OptimisticUpdate<any>[]>()

// Хук для CRUD операций с командами
export function useAdminTeamMutations() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTeam = async (teamData: any, optimisticCallback?: (teams: any[]) => void) => {
    setIsLoading(true)
    setError(null)
    
    const tempId = uuidv4()
    const optimisticTeam = {
      id: tempId,
      ...teamData,
      achievements: 0,
      created_at: new Date().toISOString()
    }

    // Оптимистичное обновление
    if (optimisticCallback) {
      const existingUpdates = optimisticUpdatesCache.get('teams') || []
      optimisticUpdatesCache.set('teams', [...existingUpdates, {
        tempId,
        operation: 'create',
        data: optimisticTeam
      }])
      optimisticCallback([optimisticTeam])
    }

    try {
      const { supabase, uploadLogo } = await import("@/lib/supabaseClient")
      
      let logoUrl = null
      const teamId = uuidv4()
      
      if (teamData.logo instanceof File) {
        logoUrl = await uploadLogo(teamData.logo, "teams", teamId)
      } else if (typeof teamData.logo === "string") {
        logoUrl = teamData.logo
      }
      
      const insertData: any = {
        id: teamId,
        name: teamData.name,
        wallet_address: teamData.walletAddress,
        description: teamData.description,
        achievements: 0,
      }
      
      if (logoUrl) insertData.logo_url = logoUrl
      
      const { error } = await supabase.from("teams").insert([insertData]).select()
      
      if (error) {
        throw new Error(error.message)
      }

      // Убираем оптимистичное обновление и инвалидируем кэш
      optimisticUpdatesCache.delete('teams')
      invalidateAdminCache(['admin-teams', 'admin-dashboard-stats'])
      
      return { success: true }
    } catch (err: any) {
      // Откатываем оптимистичное обновление
      optimisticUpdatesCache.delete('teams')
      setError(err.message || "Ошибка создания команды")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updateTeam = async (id: string, teamData: any, optimisticCallback?: (teams: any[]) => void) => {
    setIsLoading(true)
    setError(null)

    // Оптимистичное обновление
    if (optimisticCallback) {
      const updatedTeam = { id, ...teamData }
      const existingUpdates = optimisticUpdatesCache.get('teams') || []
      optimisticUpdatesCache.set('teams', [...existingUpdates, {
        tempId: `update-${id}`,
        operation: 'update',
        data: updatedTeam
      }])
      optimisticCallback([updatedTeam])
    }

    try {
      const { supabase, uploadLogo } = await import("@/lib/supabaseClient")
      
      let logoUrl = null
      if (teamData.logo instanceof File) {
        logoUrl = await uploadLogo(teamData.logo, "teams", id)
      } else if (typeof teamData.logo === "string") {
        logoUrl = teamData.logo
      }
      
      const updateData: any = {
        name: teamData.name,
        wallet_address: teamData.walletAddress,
        description: teamData.description,
      }
      
      if (logoUrl) updateData.logo_url = logoUrl
      
      const { error } = await supabase.from("teams").update(updateData).eq("id", id).select()
      
      if (error) {
        throw new Error(error.message)
      }

      // Убираем оптимистичное обновление и инвалидируем кэш
      optimisticUpdatesCache.delete('teams')
      invalidateAdminCache(['admin-teams', 'admin-dashboard-stats'])
      
      return { success: true }
    } catch (err: any) {
      optimisticUpdatesCache.delete('teams')
      setError(err.message || "Ошибка обновления команды")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTeam = async (id: string, optimisticCallback?: (id: string) => void) => {
    setIsLoading(true)
    setError(null)

    // Оптимистичное обновление
    if (optimisticCallback) {
      optimisticCallback(id)
    }

    try {
      const { supabase } = await import("@/lib/supabaseClient")
      const { error } = await supabase.from("teams").delete().eq("id", id)
      
      if (error) {
        throw new Error(error.message)
      }

      invalidateAdminCache(['admin-teams', 'admin-dashboard-stats'])
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Ошибка удаления команды")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createTeam,
    updateTeam,
    deleteTeam,
    isLoading,
    error
  }
}

// Хук для CRUD операций со стартапами
export function useAdminStartupMutations() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createStartup = async (startupData: any, optimisticCallback?: (startups: any[]) => void) => {
    setIsLoading(true)
    setError(null)
    
    const tempId = uuidv4()
    const optimisticStartup = {
      id: tempId,
      ...startupData,
      achievements: 0,
      balance: 0,
      created_at: new Date().toISOString()
    }

    if (optimisticCallback) {
      optimisticCallback([optimisticStartup])
    }

    try {
      const { supabase, uploadLogo } = await import("@/lib/supabaseClient")
      
      let logoUrl = null
      const startupId = uuidv4()
      
      if (startupData.logo instanceof File) {
        logoUrl = await uploadLogo(startupData.logo, "startups", startupId)
      } else if (typeof startupData.logo === "string") {
        logoUrl = startupData.logo
      }
      
      const insertData: any = {
        id: startupId,
        name: startupData.name,
        wallet_address: startupData.walletAddress,
        description: startupData.description,
        achievements: 0,
      }
      
      if (logoUrl) insertData.logo_url = logoUrl
      
      const { error } = await supabase.from("startups").insert([insertData]).select()
      
      if (error) {
        throw new Error(error.message)
      }

      invalidateAdminCache(['admin-startups', 'admin-dashboard-stats'])
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Ошибка создания стартапа")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updateStartup = async (id: string, startupData: any, optimisticCallback?: (startups: any[]) => void) => {
    setIsLoading(true)
    setError(null)

    if (optimisticCallback) {
      const updatedStartup = { id, ...startupData }
      optimisticCallback([updatedStartup])
    }

    try {
      const { supabase, uploadLogo } = await import("@/lib/supabaseClient")
      
      let logoUrl = null
      if (startupData.logo instanceof File) {
        logoUrl = await uploadLogo(startupData.logo, "startups", id)
      } else if (typeof startupData.logo === "string") {
        logoUrl = startupData.logo
      }
      
      const updateData: any = {
        name: startupData.name,
        wallet_address: startupData.walletAddress,
        description: startupData.description,
      }
      
      if (logoUrl) updateData.logo_url = logoUrl
      
      const { error } = await supabase.from("startups").update(updateData).eq("id", id).select()
      
      if (error) {
        throw new Error(error.message)
      }

      invalidateAdminCache(['admin-startups', 'admin-dashboard-stats'])
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Ошибка обновления стартапа")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const deleteStartup = async (id: string, optimisticCallback?: (id: string) => void) => {
    setIsLoading(true)
    setError(null)

    if (optimisticCallback) {
      optimisticCallback(id)
    }

    try {
      const { supabase } = await import("@/lib/supabaseClient")
      const { error } = await supabase.from("startups").delete().eq("id", id)
      
      if (error) {
        throw new Error(error.message)
      }

      invalidateAdminCache(['admin-startups', 'admin-dashboard-stats'])
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Ошибка удаления стартапа")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createStartup,
    updateStartup,
    deleteStartup,
    isLoading,
    error
  }
}

// Хук для CRUD операций с сотрудниками
export function useAdminStaffMutations() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createStaff = async (staffData: any, optimisticCallback?: (staff: any[]) => void) => {
    setIsLoading(true)
    setError(null)
    
    const tempId = uuidv4()
    const optimisticStaff = {
      id: tempId,
      ...staffData,
      achievements: 0,
      created_at: new Date().toISOString()
    }

    if (optimisticCallback) {
      optimisticCallback([optimisticStaff])
    }

    try {
      const { supabase, uploadLogo } = await import("@/lib/supabaseClient")
      
      let logoUrl = null
      const staffId = uuidv4()
      
      if (staffData.logo instanceof File) {
        logoUrl = await uploadLogo(staffData.logo, "staff", staffId)
      } else if (typeof staffData.logo === "string") {
        logoUrl = staffData.logo
      }
      
      const insertData: any = {
        id: staffId,
        name: staffData.name,
        wallet_address: staffData.walletAddress,
        description: staffData.description,
        achievements: 0,
      }
      
      if (logoUrl) insertData.logo_url = logoUrl
      
      const { error } = await supabase.from("staff").insert([insertData]).select()
      
      if (error) {
        throw new Error(error.message)
      }

      invalidateAdminCache(['admin-staff', 'admin-dashboard-stats'])
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Ошибка создания сотрудника")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updateStaff = async (id: string, staffData: any, optimisticCallback?: (staff: any[]) => void) => {
    setIsLoading(true)
    setError(null)

    if (optimisticCallback) {
      const updatedStaff = { id, ...staffData }
      optimisticCallback([updatedStaff])
    }

    try {
      const { supabase, uploadLogo } = await import("@/lib/supabaseClient")
      
      let logoUrl = null
      if (staffData.logo instanceof File) {
        logoUrl = await uploadLogo(staffData.logo, "staff", id)
      } else if (typeof staffData.logo === "string") {
        logoUrl = staffData.logo
      }
      
      const updateData: any = {
        name: staffData.name,
        wallet_address: staffData.walletAddress,
        description: staffData.description,
      }
      
      if (logoUrl) updateData.logo_url = logoUrl
      
      const { error } = await supabase.from("staff").update(updateData).eq("id", id).select()
      
      if (error) {
        throw new Error(error.message)
      }

      invalidateAdminCache(['admin-staff', 'admin-dashboard-stats'])
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Ошибка обновления сотрудника")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const deleteStaff = async (id: string, optimisticCallback?: (id: string) => void) => {
    setIsLoading(true)
    setError(null)

    if (optimisticCallback) {
      optimisticCallback(id)
    }

    try {
      const { supabase } = await import("@/lib/supabaseClient")
      const { error } = await supabase.from("staff").delete().eq("id", id)
      
      if (error) {
        throw new Error(error.message)
      }

      invalidateAdminCache(['admin-staff', 'admin-dashboard-stats'])
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Ошибка удаления сотрудника")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createStaff,
    updateStaff,
    deleteStaff,
    isLoading,
    error
  }
}

// Утилита для инвалидации кэша (используем глобальную переменную)
declare global {
  var adminCacheMap: Map<string, { data: any; timestamp: number }> | undefined
}

function invalidateAdminCache(keys: string[]) {
  // Используем глобальный кэш
  if (typeof globalThis !== 'undefined' && globalThis.adminCacheMap) {
    keys.forEach(key => globalThis.adminCacheMap?.delete(key))
  }
} 