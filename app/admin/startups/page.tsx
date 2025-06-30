"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { EntityTable } from "@/components/admin/entity-table"
import { supabase } from "@/lib/supabaseClient"
import { uploadEntityLogo, handleExistingLogo } from "@/lib/upload-client"
import { v4 as uuidv4 } from "uuid"

interface Startup {
  id: string
  name: string
  walletAddress: string
  balance?: number
  logo?: string | null
  description?: string
  achievements: number
  age_range_min?: number
  age_range_max?: number
  age_display?: string
}

export default function StartupsPage() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Загрузка списка стартапов из Supabase
  const fetchStartups = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error } = await supabase.from("startups").select("*")
    if (error) setError(error.message)
    setStartups(
      (data || []).map((startup: any) => ({
        id: startup.id,
        name: startup.name,
        walletAddress: startup.wallet_address,
        logo: startup.logo_url,
        description: startup.description,
        achievements: startup.achievements || 0,
        age_range_min: startup.age_range_min,
        age_range_max: startup.age_range_max,
        age_display: startup.age_display,
      }))
    )
    setIsLoading(false)
  }

  useEffect(() => {
    fetchStartups()
  }, [refreshKey])

  // ✅ СОЗДАНИЕ стартапа с унифицированной загрузкой логотипа
  const handleCreateStartup = async (data: any) => {
    try {
      const startupId = uuidv4()
      let logoPath: string | null = null

      // ✅ ОБРАБОТКА загрузки логотипа
      if (data.logo instanceof File) {
        console.log('[Startups Admin] 📤 Загружаю новый логотип для стартапа:', startupId)
        const uploadResult = await uploadEntityLogo(data.logo, "startups", startupId)
        
        if (!uploadResult.success) {
          setError(`Ошибка загрузки логотипа: ${uploadResult.error}`)
          return
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Startups Admin] ✅ Логотип загружен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL
        logoPath = handleExistingLogo(data.logo)
      }

      const insertData: any = {
        id: startupId,
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
        achievements: 0,
        age_range_min: data.ageRangeMin,
        age_range_max: data.ageRangeMax,
        age_display: data.ageDisplay,
      }
      
      if (logoPath) insertData.logo_url = logoPath

      const { error } = await supabase.from("startups").insert([insertData]).select()
      
      if (error) {
        console.error('[Startups Admin] ❌ Ошибка Supabase insert:', error)
        setError(`Ошибка создания стартапа: ${error.message}`)
        return
      }

      console.log('[Startups Admin] ✅ Стартап успешно создан:', startupId)
      fetchStartups()
    } catch (e: any) {
      console.error('[Startups Admin] 💥 Критическая ошибка создания стартапа:', e)
      setError(`Критическая ошибка: ${e.message}`)
    }
  }

  // ✅ ОБНОВЛЕНИЕ стартапа с унифицированной загрузкой логотипа
  const handleUpdateStartup = async (id: string, data: any) => {
    try {
      let logoPath: string | null = null

      // ✅ ОБРАБОТКА загрузки логотипа
      if (data.logo instanceof File) {
        console.log('[Startups Admin] 📤 Обновляю логотип для стартапа:', id)
        const uploadResult = await uploadEntityLogo(data.logo, "startups", id)
        
        if (!uploadResult.success) {
          setError(`Ошибка загрузки логотипа: ${uploadResult.error}`)
          return
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Startups Admin] ✅ Логотип обновлен:', logoPath)
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

      const { error } = await supabase.from("startups").update(updateData).eq("id", id).select()
      
      if (error) {
        console.error('[Startups Admin] ❌ Ошибка Supabase update:', error)
        setError(`Ошибка обновления стартапа: ${error.message}`)
        return
      }

      console.log('[Startups Admin] ✅ Стартап успешно обновлен:', id)
      fetchStartups()
    } catch (e: any) {
      console.error('[Startups Admin] 💥 Критическая ошибка обновления стартапа:', e)
      setError(`Критическая ошибка: ${e.message}`)
    }
  }

  // Удаление стартапа
  const handleDeleteStartup = async (id: string) => {
    const { error } = await supabase.from("startups").delete().eq("id", id)
    if (error) setError(error.message)
    fetchStartups()
  }

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-display font-bold">Manage Startups</h1>
          <button
            onClick={forceRefresh}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            🔄 Обновить
          </button>
        </div>
        {error && <div className="text-red-500">{error}</div>}
        <EntityTable
          title="Startups"
          entities={startups.map(startup => {
            // Генерируем английский текст возраста
            const ageDisplay = startup.age_range_min && startup.age_range_max 
              ? (startup.age_range_min === startup.age_range_max 
                  ? `${startup.age_range_min} y.o.` 
                  : `${startup.age_range_min}-${startup.age_range_max} y.o.`)
              : startup.age_display || 'Age not set'
            
            return {
              id: startup.id,
              name: startup.name,
              walletAddress: startup.walletAddress,
              logo: startup.logo,
              description: startup.description,
              ageDisplay: ageDisplay,
              ageRangeMin: startup.age_range_min,
              ageRangeMax: startup.age_range_max,
            }
          })}
          entityType="startup"
          onCreateEntity={handleCreateStartup}
          onUpdateEntity={handleUpdateStartup}
          onDeleteEntity={handleDeleteStartup}
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
