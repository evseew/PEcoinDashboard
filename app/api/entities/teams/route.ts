// API для получения списка команд
import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function GET(request: NextRequest) {
  try {
    const { data: teams, error } = await supabase
      .from("teams")
      .select("id, name, wallet_address, description, logo_url, achievements")
      .order('name')

    if (error) {
      console.error('❌ Error fetching teams:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch teams'
      }, { status: 500 })
    }

    // Адаптируем данные под ожидаемый формат
    const adaptedData = (teams || []).map(team => ({
      id: team.id,
      name: team.name,
      walletAddress: team.wallet_address,
      description: team.description,
      logoUrl: team.logo_url,
      achievements: team.achievements
    }))

    return NextResponse.json({
      success: true,
      data: adaptedData,
      total: adaptedData.length
    })

  } catch (error) {
    console.error('❌ Teams API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 