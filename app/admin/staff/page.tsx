"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { EntityTable } from "@/components/admin/entity-table"
import { supabase, uploadLogo } from "@/lib/supabaseClient"
import { v4 as uuidv4 } from "uuid"

interface Staff {
  id: string
  name: string
  walletAddress: string
  logo?: string | null
  description?: string
  balance: number
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaff = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error } = await supabase.from("staff").select("*")
    if (error) setError(error.message)
    setStaff(
      (data || []).map((person: any) => ({
        id: person.id,
        name: person.name,
        walletAddress: person.wallet_address,
        logo: person.logo_url,
        description: person.description,
        balance: 0,
      }))
    )
    setIsLoading(false)
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleCreateStaff = async (data: any) => {
    try {
      let logoUrl = null
      const staffId = uuidv4()
      if (data.logo instanceof File) {
        logoUrl = await uploadLogo(data.logo, "staff", staffId)
      } else if (typeof data.logo === "string") {
        logoUrl = data.logo
      }
      const insertData: any = {
        id: staffId,
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
      }
      if (logoUrl) insertData.logo_url = logoUrl
      const { error } = await supabase.from("staff").insert([insertData]).select()
      if (error) {
        console.error("Supabase insert error:", error)
        setError(error.message || JSON.stringify(error))
        return
      }
      fetchStaff()
    } catch (e: any) {
      console.error("Create staff error:", e)
      setError(e.message || JSON.stringify(e))
    }
  }

  const handleUpdateStaff = async (id: string, data: any) => {
    try {
      let logoUrl = null
      if (data.logo instanceof File) {
        logoUrl = await uploadLogo(data.logo, "staff", id)
      } else if (typeof data.logo === "string") {
        logoUrl = data.logo
      }
      const updateData: any = {
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
      }
      if (logoUrl) updateData.logo_url = logoUrl
      const { error } = await supabase.from("staff").update(updateData).eq("id", id).select()
      if (error) {
        console.error("Supabase update error:", error)
        setError(error.message || JSON.stringify(error))
        return
      }
      fetchStaff()
    } catch (e: any) {
      console.error("Update staff error:", e)
      setError(e.message || JSON.stringify(e))
    }
  }

  const handleDeleteStaff = async (id: string) => {
    const { error } = await supabase.from("staff").delete().eq("id", id)
    if (error) throw error
    fetchStaff()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Manage Staff</h1>
        {error && <div className="text-red-500">{error}</div>}
        <EntityTable
          title="Staff Members"
          entities={staff}
          entityType="staff"
          onCreateEntity={handleCreateStaff}
          onUpdateEntity={handleUpdateStaff}
          onDeleteEntity={handleDeleteStaff}
          extraColumns={[
            {
              key: "description",
              label: "Description",
            },
          ]}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  )
}
