import { NextRequest, NextResponse } from 'next/server'
import { getCachedTokenBalances } from '@/lib/cached-token-balance'
import { getAlchemyKey } from '@/lib/alchemy/solana'

export async function POST(request: NextRequest) {
  try {
    const { wallets, mint } = await request.json()
    
    if (!wallets || !Array.isArray(wallets) || !mint) {
      return NextResponse.json(
        { error: 'Wallets array and mint address are required' },
        { status: 400 }
      )
    }
    
    console.log(`[Token Balances API] Запрос балансов для ${wallets.length} кошельков`)
    
    const apiKey = getAlchemyKey()
    const balances = await getCachedTokenBalances(wallets, mint, apiKey)
    
    // Конвертируем Map в объект для JSON
    const balancesObject: Record<string, number> = {}
    balances.forEach((balance, wallet) => {
      balancesObject[wallet] = balance
    })
    
    console.log(`[Token Balances API] Возвращено ${balances.size} балансов`)
    
    return NextResponse.json({
      success: true,
      balances: balancesObject,
      cached: true
    })
    
  } catch (error) {
    console.error('[Token Balances API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch token balances',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 