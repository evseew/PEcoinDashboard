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
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загрузка списка команд из Supabase
  const fetchTeams = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error } = await supabase.from("teams").select("*")
    if (error) setError(error.message)
    setTeams(data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchTeams()
  }, [])

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Manage Teams</h1>
        {error && <div className="text-red-500">{error}</div>}
        <EntityTable
          title="Teams"
          entities={teams.map(team => ({
            id: team.id,
            name: team.name,
            walletAddress: team.wallet_address,
            logo: team.logo_url,
            description: team.description,
            achievements: team.achievements,
            balance: 0,
          }))}
          entityType="team"
          onCreateEntity={handleCreateTeam}
          onUpdateEntity={handleUpdateTeam}
          onDeleteEntity={handleDeleteTeam}
          extraColumns={[
            {
              key: "achievements",
              label: "Achievements",
            },
          ]}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  )
}
