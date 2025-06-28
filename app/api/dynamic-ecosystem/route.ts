// ✅ API ОТКЛЮЧЕН - DynamicEcosystemCache полностью отключен для предотвращения дублирования запросов

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Dynamic ecosystem API отключен для предотвращения дублирования запросов',
    disabled: true,
    recommendation: 'Используйте PublicDashboard для получения данных экосистемы'
  })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Dynamic ecosystem API отключен для предотвращения дублирования запросов',
    disabled: true,
    recommendation: 'Используйте PublicDashboard для получения данных экосистемы'
  })
} 