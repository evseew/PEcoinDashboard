"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { EntityTable } from "@/components/admin/entity-table"
import { supabase } from "@/lib/supabaseClient"
import { uploadEntityLogo, handleExistingLogo } from "@/lib/upload-client"
import { v4 as uuidv4 } from "uuid"

interface Team {
  id: string
  name: string
  wallet_address: string
  balance: number
  logo_url?: string | null
  description?: string
  achievements?: number
  age_range_min?: number
  age_range_max?: number
  age_display?: string
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Загрузка списка команд из Supabase
  const fetchTeams = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error } = await supabase.from("teams").select("*")
    if (error) setError(error.message)
    setTeams((data || []).map(team => ({
      ...team,
      achievements: team.achievements || 0
    })))
    setIsLoading(false)
  }

  useEffect(() => {
    fetchTeams()
  }, [refreshKey])

  // ✅ СОЗДАНИЕ команды с унифицированной загрузкой логотипа
  const handleCreateTeam = async (data: any) => {
    try {
      const teamId = uuidv4()
      let logoPath: string | null = null

      // ✅ ОБРАБОТКА загрузки логотипа
      if (data.logo instanceof File) {
        console.log('[Teams Admin] 📤 Загружаю новый логотип для команды:', teamId)
        const uploadResult = await uploadEntityLogo(data.logo, "teams", teamId)
        
        if (!uploadResult.success) {
          setError(`Ошибка загрузки логотипа: ${uploadResult.error}`)
          return
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Teams Admin] ✅ Логотип загружен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL
        logoPath = handleExistingLogo(data.logo)
      }

      const insertData: any = {
        id: teamId,
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
        achievements: 0,
        age_range_min: data.ageRangeMin,
        age_range_max: data.ageRangeMax,
        age_display: data.ageDisplay,
      }
      
      if (logoPath) insertData.logo_url = logoPath

      const { error } = await supabase.from("teams").insert([insertData]).select()
      
      if (error) {
        console.error('[Teams Admin] ❌ Ошибка Supabase insert:', error)
        setError(`Ошибка создания команды: ${error.message}`)
        return
      }

      console.log('[Teams Admin] ✅ Команда успешно создана:', teamId)
      fetchTeams()
    } catch (e: any) {
      console.error('[Teams Admin] 💥 Критическая ошибка создания команды:', e)
      setError(`Критическая ошибка: ${e.message}`)
    }
  }

  // ✅ ОБНОВЛЕНИЕ команды с унифицированной загрузкой логотипа
  const handleUpdateTeam = async (id: string, data: any) => {
    try {
      let logoPath: string | null = null

      // ✅ ОБРАБОТКА загрузки логотипа
      if (data.logo instanceof File) {
        console.log('[Teams Admin] 📤 Обновляю логотип для команды:', id)
        const uploadResult = await uploadEntityLogo(data.logo, "teams", id)
        
        if (!uploadResult.success) {
          setError(`Ошибка загрузки логотипа: ${uploadResult.error}`)
          return
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Teams Admin] ✅ Логотип обновлен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL (не меняем логотип)
        logoPath = handleExistingLogo(data.logo)
      }

      const updateData: any = {
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
        age_range_min: data.ageRangeMin,
        age_range_max: data.ageRangeMax,
        age_display: data.ageDisplay,
      }
      
      // ✅ ОБНОВЛЯЕМ логотип только если был загружен новый файл
      if (logoPath !== null) {
        updateData.logo_url = logoPath
      }

      const { error } = await supabase.from("teams").update(updateData).eq("id", id).select()
      
      if (error) {
        console.error('[Teams Admin] ❌ Ошибка Supabase update:', error)
        setError(`Ошибка обновления команды: ${error.message}`)
        return
      }

      console.log('[Teams Admin] ✅ Команда успешно обновлена:', id)
      fetchTeams()
    } catch (e: any) {
      console.error('[Teams Admin] 💥 Критическая ошибка обновления команды:', e)
      setError(`Критическая ошибка: ${e.message}`)
    }
  }

  // Удаление команды
  const handleDeleteTeam = async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id)
    if (error) setError(error.message)
    fetchTeams()
  }

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-display font-bold">Manage Teams</h1>
          <button
            onClick={forceRefresh}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            🔄 Обновить
          </button>
        </div>
        {error && <div className="text-red-500">{error}</div>}
        <EntityTable
          title="Teams"
          entities={teams.map(team => {
            // Генерируем английский текст возраста
            const ageDisplay = team.age_range_min && team.age_range_max 
              ? (team.age_range_min === team.age_range_max 
                  ? `${team.age_range_min} y.o.` 
                  : `${team.age_range_min}-${team.age_range_max} y.o.`)
              : team.age_display || 'Age not set'
            
            return {
              id: team.id,
              name: team.name,
              walletAddress: team.wallet_address,
              logo: team.logo_url,
              description: team.description,
              ageDisplay: ageDisplay,
              ageRangeMin: team.age_range_min,
              ageRangeMax: team.age_range_max,
            }
          })}
          entityType="team"
          onCreateEntity={handleCreateTeam}
          onUpdateEntity={handleUpdateTeam}
          onDeleteEntity={handleDeleteTeam}
          extraColumns={[
            { key: "ageDisplay", label: "Age" }
          ]}
          showBalance={false}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  )
}
