// API для получения списка сотрудников
import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function GET(request: NextRequest) {
  try {
    const { data: staff, error } = await supabase
      .from("staff")
      .select("id, name, wallet_address, description, logo_url")
      .order('name')

    if (error) {
      console.error('❌ Error fetching staff:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch staff'
      }, { status: 500 })
    }

    // Адаптируем данные под ожидаемый формат
    const adaptedData = (staff || []).map(person => ({
      id: person.id,
      name: person.name,
      walletAddress: person.wallet_address,
      description: person.description,
      logoUrl: person.logo_url
    }))

    return NextResponse.json({
      success: true,
      data: adaptedData,
      total: adaptedData.length
    })

  } catch (error) {
    console.error('❌ Staff API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 