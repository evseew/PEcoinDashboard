import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function GET(request: NextRequest) {
  try {
    // Проверяем достижения у стартапов
    const { data: startups, error: startupsError } = await supabase
      .from('startups')
      .select('id, name, achievements')
      .order('name')
    
    if (startupsError) {
      throw startupsError
    }

    // Проверяем достижения у команд
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, achievements')
      .order('name')
    
    if (teamsError) {
      throw teamsError
    }

    console.log('📊 Стартапы:', startups)
    console.log('📊 Команды:', teams)
    
    return NextResponse.json({
      success: true,
      data: {
        startups: startups || [],
        teams: teams || []
      }
    })

  } catch (error) {
    console.error('❌ Ошибка проверки достижений:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка проверки достижений',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 