import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { uploadEntityLogo, handleExistingLogo } from "@/lib/upload-client"

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
    
    const teamId = uuidv4()
    const optimisticTeam = {
      id: teamId,
      ...teamData,
      achievements: 0,
      balance: 0,
      created_at: new Date().toISOString()
    }

    // Оптимистичное обновление
    if (optimisticCallback) {
      optimisticUpdatesCache.set('teams', [{
        tempId: teamId,
        operation: 'create',
        data: optimisticTeam
      }])
      optimisticCallback([optimisticTeam])
    }

    try {
      const { supabase } = await import("@/lib/supabaseClient")
      
      let logoPath: string | null = null

      // ✅ НОВАЯ унифицированная система загрузки
      if (teamData.logo instanceof File) {
        console.log('[Team Mutations] 📤 Загружаю новый логотип для команды:', teamId)
        const uploadResult = await uploadEntityLogo(teamData.logo, "teams", teamId)
        
        if (!uploadResult.success) {
          throw new Error(`Ошибка загрузки логотипа: ${uploadResult.error}`)
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Team Mutations] ✅ Логотип загружен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL
        logoPath = handleExistingLogo(teamData.logo)
      }
      
      const insertData: any = {
        id: teamId,
        name: teamData.name,
        wallet_address: teamData.walletAddress,
        description: teamData.description,
        achievements: 0,
        age_range_min: teamData.ageRangeMin,
        age_range_max: teamData.ageRangeMax,
        age_display: teamData.ageDisplay,
      }
      
      if (logoPath) insertData.logo_url = logoPath

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
      const { supabase } = await import("@/lib/supabaseClient")
      
      let logoPath: string | null = null

      // ✅ НОВАЯ унифицированная система загрузки
      if (teamData.logo instanceof File) {
        console.log('[Team Mutations] 📤 Обновляю логотип для команды:', id)
        const uploadResult = await uploadEntityLogo(teamData.logo, "teams", id)
        
        if (!uploadResult.success) {
          throw new Error(`Ошибка загрузки логотипа: ${uploadResult.error}`)
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Team Mutations] ✅ Логотип обновлен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL (не меняем логотип)
        logoPath = handleExistingLogo(teamData.logo)
      }
      
      const updateData: any = {
        name: teamData.name,
        wallet_address: teamData.walletAddress,
        description: teamData.description,
        age_range_min: teamData.ageRangeMin,
        age_range_max: teamData.ageRangeMax,
        age_display: teamData.ageDisplay,
      }
      
      // ✅ ОБНОВЛЯЕМ логотип только если был загружен новый файл
      if (logoPath !== null) {
        updateData.logo_url = logoPath
      }
      
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
    
    const startupId = uuidv4()
    const optimisticStartup = {
      id: startupId,
      ...startupData,
      achievements: 0,
      balance: 0,
      created_at: new Date().toISOString()
    }

    if (optimisticCallback) {
      optimisticCallback([optimisticStartup])
    }

    try {
      const { supabase } = await import("@/lib/supabaseClient")
      
      let logoPath: string | null = null
      
      // ✅ НОВАЯ унифицированная система загрузки
      if (startupData.logo instanceof File) {
        console.log('[Startup Mutations] 📤 Загружаю новый логотип для стартапа:', startupId)
        const uploadResult = await uploadEntityLogo(startupData.logo, "startups", startupId)
        
        if (!uploadResult.success) {
          throw new Error(`Ошибка загрузки логотипа: ${uploadResult.error}`)
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Startup Mutations] ✅ Логотип загружен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL
        logoPath = handleExistingLogo(startupData.logo)
      }
      
      const insertData: any = {
        id: startupId,
        name: startupData.name,
        wallet_address: startupData.walletAddress,
        description: startupData.description,
        achievements: 0,
        age_range_min: startupData.ageRangeMin,
        age_range_max: startupData.ageRangeMax,
        age_display: startupData.ageDisplay,
      }
      
      if (logoPath) insertData.logo_url = logoPath
      
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
      const { supabase } = await import("@/lib/supabaseClient")
      
      let logoPath: string | null = null

      // ✅ НОВАЯ унифицированная система загрузки
      if (startupData.logo instanceof File) {
        console.log('[Startup Mutations] 📤 Обновляю логотип для стартапа:', id)
        const uploadResult = await uploadEntityLogo(startupData.logo, "startups", id)
        
        if (!uploadResult.success) {
          throw new Error(`Ошибка загрузки логотипа: ${uploadResult.error}`)
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Startup Mutations] ✅ Логотип обновлен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL (не меняем логотип)
        logoPath = handleExistingLogo(startupData.logo)
      }
      
      const updateData: any = {
        name: startupData.name,
        wallet_address: startupData.walletAddress,
        description: startupData.description,
        age_range_min: startupData.ageRangeMin,
        age_range_max: startupData.ageRangeMax,
        age_display: startupData.ageDisplay,
      }
      
      // ✅ ОБНОВЛЯЕМ логотип только если был загружен новый файл
      if (logoPath !== null) {
        updateData.logo_url = logoPath
      }
      
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
    
    const staffId = uuidv4()
    const optimisticStaff = {
      id: staffId,
      ...staffData,
      balance: 0,
      nftCount: 0,
      created_at: new Date().toISOString()
    }

    if (optimisticCallback) {
      optimisticCallback([optimisticStaff])
    }

    try {
      const { supabase } = await import("@/lib/supabaseClient")
      
      let logoPath: string | null = null
      
      // ✅ НОВАЯ унифицированная система загрузки
      if (staffData.logo instanceof File) {
        console.log('[Staff Mutations] 📤 Загружаю новый логотип для участника состава:', staffId)
        const uploadResult = await uploadEntityLogo(staffData.logo, "staff", staffId)
        
        if (!uploadResult.success) {
          throw new Error(`Ошибка загрузки логотипа: ${uploadResult.error}`)
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Staff Mutations] ✅ Логотип загружен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL
        logoPath = handleExistingLogo(staffData.logo)
      }
      
      const insertData: any = {
        id: staffId,
        name: staffData.name,
        wallet_address: staffData.walletAddress,
        description: staffData.description,
      }
      
      if (logoPath) insertData.logo_url = logoPath
      
      const { error } = await supabase.from("staff").insert([insertData]).select()
      
      if (error) {
        throw new Error(error.message)
      }

      invalidateAdminCache(['admin-staff', 'admin-dashboard-stats'])
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Ошибка создания участника состава")
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
      const { supabase } = await import("@/lib/supabaseClient")
      
      let logoPath: string | null = null

      // ✅ НОВАЯ унифицированная система загрузки
      if (staffData.logo instanceof File) {
        console.log('[Staff Mutations] 📤 Обновляю логотип для участника состава:', id)
        const uploadResult = await uploadEntityLogo(staffData.logo, "staff", id)
        
        if (!uploadResult.success) {
          throw new Error(`Ошибка загрузки логотипа: ${uploadResult.error}`)
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Staff Mutations] ✅ Логотип обновлен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL (не меняем логотип)
        logoPath = handleExistingLogo(staffData.logo)
      }
      
      const updateData: any = {
        name: staffData.name,
        wallet_address: staffData.walletAddress,
        description: staffData.description,
      }
      
      // ✅ ОБНОВЛЯЕМ логотип только если был загружен новый файл
      if (logoPath !== null) {
        updateData.logo_url = logoPath
      }
      
      const { error } = await supabase.from("staff").update(updateData).eq("id", id).select()
      
      if (error) {
        throw new Error(error.message)
      }

      invalidateAdminCache(['admin-staff', 'admin-dashboard-stats'])
      return { success: true }
    } catch (err: any) {
      setError(err.message || "Ошибка обновления участника состава")
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
      setError(err.message || "Ошибка удаления участника состава")
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