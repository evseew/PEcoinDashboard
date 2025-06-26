import { NextRequest, NextResponse } from 'next/server'
import { getCachedTokenBalances } from '@/lib/cached-token-balance'
import { getAlchemyKey } from '@/lib/alchemy/solana'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { wallets, mint } = await request.json()
    
    if (!wallets || !Array.isArray(wallets) || !mint) {
      return NextResponse.json(
        { error: 'Wallets array and mint address are required' },
        { status: 400 }
      )
    }
    
    console.log(`[Token Balances API] ⏱️ Запрос балансов для ${wallets.length} кошельков`)
    console.log(`[Token Balances API] 🌍 Environment: ${process.env.NODE_ENV}`)
    
    const apiKeyStart = Date.now()
    const apiKey = getAlchemyKey()
    console.log(`[Token Balances API] 🔑 API Key получен за ${Date.now() - apiKeyStart}ms`)
    
    const balancesStart = Date.now()
    const balances = await getCachedTokenBalances(wallets, mint, apiKey)
    const balancesTime = Date.now() - balancesStart
    
    console.log(`[Token Balances API] 💰 Балансы получены за ${balancesTime}ms`)
    
    // Конвертируем Map в объект для JSON
    const balancesObject: Record<string, number> = {}
    balances.forEach((balance, wallet) => {
      balancesObject[wallet] = balance
    })
    
    const totalTime = Date.now() - startTime
    console.log(`[Token Balances API] ✅ Возвращено ${balances.size} балансов за ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      balances: balancesObject,
      cached: true,
      timing: {
        total: totalTime,
        balances: balancesTime,
        walletsCount: wallets.length
      }
    })
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[Token Balances API] ❌ Error after ${totalTime}ms:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch token balances',
        details: error instanceof Error ? error.message : 'Unknown error',
        timing: { total: totalTime }
      },
      { status: 500 }
    )
  }
} 