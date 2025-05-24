// API для получения списка стартапов
import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function GET(request: NextRequest) {
  try {
    const { data: startups, error } = await supabase
      .from("startups")
      .select("id, name, wallet_address, description, logo_url, achievements")
      .order('name')

    if (error) {
      console.error('❌ Error fetching startups:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch startups'
      }, { status: 500 })
    }

    // Адаптируем данные под ожидаемый формат
    const adaptedData = (startups || []).map(startup => ({
      id: startup.id,
      name: startup.name,
      walletAddress: startup.wallet_address,
      description: startup.description,
      logoUrl: startup.logo_url,
      achievements: startup.achievements
    }))

    return NextResponse.json({
      success: true,
      data: adaptedData,
      total: adaptedData.length
    })

  } catch (error) {
    console.error('❌ Startups API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 