"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { EntityTable } from "@/components/admin/entity-table"
import { supabase, uploadLogo } from "@/lib/supabaseClient"
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

  // Создание команды
  const handleCreateTeam = async (data: any) => {
    try {
      let logoUrl = null
      const teamId = uuidv4()
      if (data.logo instanceof File) {
        logoUrl = await uploadLogo(data.logo, "teams", teamId)
      } else if (typeof data.logo === "string") {
        logoUrl = data.logo
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
      if (logoUrl) insertData.logo_url = logoUrl
      const { error } = await supabase.from("teams").insert([insertData]).select()
      if (error) {
        console.error("Supabase insert error:", error)
        setError(error.message || JSON.stringify(error))
        return
      }
      fetchTeams()
    } catch (e: any) {
      console.error("Create team error:", e)
      setError(e.message || JSON.stringify(e))
    }
  }

  // Обновление команды
  const handleUpdateTeam = async (id: string, data: any) => {
    try {
      let logoUrl = null
      if (data.logo instanceof File) {
        logoUrl = await uploadLogo(data.logo, "teams", id)
      } else if (typeof data.logo === "string") {
        logoUrl = data.logo
      }
      const updateData: any = {
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
        age_range_min: data.ageRangeMin,
        age_range_max: data.ageRangeMax,
        age_display: data.ageDisplay,
      }
      if (logoUrl) updateData.logo_url = logoUrl
      const { error } = await supabase.from("teams").update(updateData).eq("id", id).select()
      if (error) {
        console.error("Supabase update error:", error)
        setError(error.message || JSON.stringify(error))
        return
      }
      fetchTeams()
    } catch (e: any) {
      console.error("Update team error:", e)
      setError(e.message || JSON.stringify(e))
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
              balance: 0,
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
