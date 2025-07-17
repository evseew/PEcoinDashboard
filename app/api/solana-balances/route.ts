import { NextRequest, NextResponse } from 'next/server'
import { getMultipleSolanaBalances } from '@/lib/alchemy/solana'
import { getAlchemyKey } from '@/lib/alchemy/solana'

// ✅ ПРОСТОЙ 2-УРОВНЕВЫЙ КЭШИРОВАНИЕ: In-memory кэш для SOL балансов
const solBalanceCache = new Map<string, { balance: number; timestamp: number }>()
const SOL_BALANCE_CACHE_TTL = 2 * 60 * 1000 // 2 минуты

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { wallets } = await request.json()
    
    if (!wallets || !Array.isArray(wallets)) {
      return NextResponse.json(
        { error: 'Wallets array is required' },
        { status: 400 }
      )
    }
    
    console.log(`[SolanaBalances API] 🚀 Запрос SOL балансов для ${wallets.length} кошельков`)
    
    const apiKey = getAlchemyKey()
    const now = Date.now()
    
    // ✅ Проверяем простой кэш
    const cachedBalances = new Map<string, number>()
    const walletsToFetch: string[] = []
    
    for (const wallet of wallets) {
      const cacheKey = `sol:${wallet}`
      const cached = solBalanceCache.get(cacheKey)
      
      if (cached && (now - cached.timestamp) < SOL_BALANCE_CACHE_TTL) {
        cachedBalances.set(wallet, cached.balance)
        console.log(`[SolanaBalances] 💾 Кэш: ${wallet.slice(0,8)}... = ${cached.balance.toFixed(4)} SOL`)
      } else {
        walletsToFetch.push(wallet)
      }
    }
    
    console.log(`[SolanaBalances] 📊 Из кэша: ${cachedBalances.size}, загружаем: ${walletsToFetch.length}`)
    
    // ✅ Загружаем недостающие SOL балансы через Alchemy
    let fetchedBalances = new Map<string, number>()
    if (walletsToFetch.length > 0) {
      const balancesStart = Date.now()
      fetchedBalances = await getMultipleSolanaBalances(walletsToFetch, apiKey)
      const balancesTime = Date.now() - balancesStart
      
      console.log(`[SolanaBalances] ⚡ Загружено ${fetchedBalances.size} новых SOL балансов за ${balancesTime}ms`)
      
      // ✅ Сохраняем в простой кэш
      for (const [wallet, balance] of fetchedBalances) {
        const cacheKey = `sol:${wallet}`
        solBalanceCache.set(cacheKey, { balance, timestamp: now })
      }
    }
    
    // ✅ Объединяем результаты
    const allBalances = new Map([...cachedBalances, ...fetchedBalances])
    
    // Конвертируем в объект для JSON
    const balancesObject: Record<string, number> = {}
    allBalances.forEach((balance, wallet) => {
      balancesObject[wallet] = balance
    })
    
    const totalTime = Date.now() - startTime
    console.log(`[SolanaBalances] ✅ 2-УРОВНЕВЫЙ КЭШИ: ${allBalances.size} SOL балансов за ${totalTime}ms`)
    console.log(`[SolanaBalances] 📈 Кэш: ${cachedBalances.size} + Загружено: ${fetchedBalances.size}`)

    return NextResponse.json({
      success: true,
      balances: balancesObject,
      cached: cachedBalances.size > 0,
      timing: {
        total: totalTime,
        walletsCount: wallets.length,
        fromCache: cachedBalances.size,
        fromAPI: fetchedBalances.size
      }
    })
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[SolanaBalances] ❌ Ошибка за ${totalTime}ms:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch SOL balances',
        details: error instanceof Error ? error.message : 'Unknown error',
        timing: { total: totalTime }
      },
      { status: 500 }
    )
  }
} 