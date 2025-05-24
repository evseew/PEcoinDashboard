"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { EntityTable } from "@/components/admin/entity-table"
import { supabase, uploadLogo } from "@/lib/supabaseClient"
import { v4 as uuidv4 } from "uuid"

interface Startup {
  id: string
  name: string
  walletAddress: string
  balance: number
  logo?: string | null
  description?: string
  achievements: number
}

export default function StartupsPage() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        achievements: startup.achievements,
        balance: 0,
      }))
    )
    setIsLoading(false)
  }

  useEffect(() => {
    fetchStartups()
  }, [])

  // Создание стартапа
  const handleCreateStartup = async (data: any) => {
    try {
      let logoUrl = null
      const startupId = uuidv4()
      if (data.logo instanceof File) {
        logoUrl = await uploadLogo(data.logo, "startups", startupId)
      } else if (typeof data.logo === "string") {
        logoUrl = data.logo
      }
      const insertData: any = {
        id: startupId,
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
        achievements: 0,
      }
      if (logoUrl) insertData.logo_url = logoUrl
      const { error } = await supabase.from("startups").insert([insertData]).select()
      if (error) {
        console.error("Supabase insert error:", error)
        setError(error.message || JSON.stringify(error))
        return
      }
      fetchStartups()
    } catch (e: any) {
      console.error("Create startup error:", e)
      setError(e.message || JSON.stringify(e))
    }
  }

  // Обновление стартапа
  const handleUpdateStartup = async (id: string, data: any) => {
    try {
      let logoUrl = null
      if (data.logo instanceof File) {
        logoUrl = await uploadLogo(data.logo, "startups", id)
      } else if (typeof data.logo === "string") {
        logoUrl = data.logo
      }
      const updateData: any = {
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
      }
      if (logoUrl) updateData.logo_url = logoUrl
      const { error } = await supabase.from("startups").update(updateData).eq("id", id).select()
      if (error) {
        console.error("Supabase update error:", error)
        setError(error.message || JSON.stringify(error))
        return
      }
      fetchStartups()
    } catch (e: any) {
      console.error("Update startup error:", e)
      setError(e.message || JSON.stringify(e))
    }
  }

  // Удаление стартапа
  const handleDeleteStartup = async (id: string) => {
    const { error } = await supabase.from("startups").delete().eq("id", id)
    if (error) setError(error.message)
    fetchStartups()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Manage Startups</h1>
        {error && <div className="text-red-500">{error}</div>}
        <EntityTable
          title="Startups"
          entities={startups}
          entityType="startup"
          onCreateEntity={handleCreateStartup}
          onUpdateEntity={handleUpdateStartup}
          onDeleteEntity={handleDeleteStartup}
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
