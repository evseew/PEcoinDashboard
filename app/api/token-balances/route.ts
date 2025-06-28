import { NextRequest, NextResponse } from 'next/server'
import { getMultipleTokenBalances } from '@/lib/alchemy/solana'
import { getAlchemyKey } from '@/lib/alchemy/solana'

// ✅ УПРОЩЕННЫЙ 2-УРОВНЕВЫЙ КЭШИРОВАНИЕ: Простой in-memory кэш в API endpoint
const balanceCache = new Map<string, { balance: number; timestamp: number }>()
const BALANCE_CACHE_TTL = 2 * 60 * 1000 // 2 минуты

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
    
    console.log(`[TokenBalances API] 🚀 УПРОЩЕННЫЙ запрос балансов для ${wallets.length} кошельков`)
    
    const apiKey = getAlchemyKey()
    const now = Date.now()
    
    // ✅ Проверяем простой кэш
    const cachedBalances = new Map<string, number>()
    const walletsToFetch: string[] = []
    
    for (const wallet of wallets) {
      const cacheKey = `${wallet}:${mint}`
      const cached = balanceCache.get(cacheKey)
      
      if (cached && (now - cached.timestamp) < BALANCE_CACHE_TTL) {
        cachedBalances.set(wallet, cached.balance)
        console.log(`[TokenBalances] 💾 Кэш: ${wallet.slice(0,8)}... = ${cached.balance}`)
      } else {
        walletsToFetch.push(wallet)
      }
    }
    
    console.log(`[TokenBalances] 📊 Из кэша: ${cachedBalances.size}, загружаем: ${walletsToFetch.length}`)
    
    // ✅ Загружаем недостающие балансы НАПРЯМУЮ через Alchemy
    let fetchedBalances = new Map<string, number>()
    if (walletsToFetch.length > 0) {
      const balancesStart = Date.now()
      fetchedBalances = await getMultipleTokenBalances(walletsToFetch, mint, apiKey)
      const balancesTime = Date.now() - balancesStart
      
      console.log(`[TokenBalances] ⚡ Загружено ${fetchedBalances.size} новых балансов за ${balancesTime}ms`)
      
      // ✅ Сохраняем в простой кэш
      for (const [wallet, balance] of fetchedBalances) {
        const cacheKey = `${wallet}:${mint}`
        balanceCache.set(cacheKey, { balance, timestamp: now })
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
    console.log(`[TokenBalances] ✅ 2-УРОВНЕВЫЙ КЭШИ: ${allBalances.size} балансов за ${totalTime}ms`)
    console.log(`[TokenBalances] 📈 Кэш: ${cachedBalances.size} + Загружено: ${fetchedBalances.size}`)

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
    console.error(`[TokenBalances] ❌ Ошибка за ${totalTime}ms:`, error)
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