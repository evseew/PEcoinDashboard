// Кэшированная версия получения балансов SPL токенов
// Избегает дублирования запросов при высокой нагрузке

import { getTokenBalance } from './alchemy/solana'
import { serverCache, ServerCache } from './server-cache'

/**
 * Интерфейс для запроса баланса токена
 */
interface TokenBalanceRequest {
  owner: string
  mint: string 
  apiKey: string
}

/**
 * Получить баланс SPL токена с кэшированием
 */
export async function getCachedTokenBalance({ owner, mint, apiKey }: TokenBalanceRequest): Promise<number> {
  const cacheKey = `token-balance:${owner}:${mint}`
  
  const balance = await serverCache.getOrFetch(
    cacheKey,
    async () => {
      console.log(`[TokenBalance] Загружаю баланс для ${owner.slice(0, 8)}...`)
      const result = await getTokenBalance(owner, mint, apiKey)
      return result || 0
    },
    'TOKEN_BALANCE'
  )
  
  return balance
}

/**
 * Получить балансы для нескольких кошельков одновременно с кэшированием
 */
export async function getCachedTokenBalances(
  wallets: string[],
  mint: string,
  apiKey: string
): Promise<Map<string, number>> {
  const startTime = Date.now()
  const results = new Map<string, number>()
  
  console.log(`[CachedTokenBalances] 🔄 Запрос ${wallets.length} балансов`)
  
  // Batch размер зависит от окружения - на продакшене меньше для избежания rate limiting
  const BATCH_SIZE = process.env.NODE_ENV === 'production' ? 3 : 8
  const batches = []
  
  for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
    batches.push(wallets.slice(i, i + BATCH_SIZE))
  }
  
  console.log(`[CachedTokenBalances] 📦 Обрабатываю ${wallets.length} кошельков в ${batches.length} батчах по ${BATCH_SIZE}`)
  
  // Обрабатываем пачки последовательно, но внутри пачки - параллельно
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const batchStart = Date.now()
    
    console.log(`[CachedTokenBalances] 🎯 Batch ${batchIndex + 1}/${batches.length}: ${batch.length} кошельков`)
    
    const batchPromises = batch.map(async (wallet, index) => {
      const walletStart = Date.now()
      try {
        const balance = await getCachedTokenBalance({ owner: wallet, mint, apiKey })
        const walletTime = Date.now() - walletStart
        console.log(`[CachedTokenBalances] 💰 Кошелек ${wallet.slice(0,8)}...: ${balance} (${walletTime}ms)`)
        return { wallet, balance }
      } catch (error) {
        const walletTime = Date.now() - walletStart
        console.error(`[CachedTokenBalances] ❌ Ошибка ${wallet.slice(0,8)}... за ${walletTime}ms:`, error)
        return { wallet, balance: 0 }
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    const batchTime = Date.now() - batchStart
    
    // Заполняем карту результатов
    batchResults.forEach(({ wallet, balance }) => {
      results.set(wallet, balance)
    })
    
    console.log(`[CachedTokenBalances] ✅ Batch ${batchIndex + 1} завершен за ${batchTime}ms`)
    
    // Пауза между пачками только на продакшене и если есть еще пачки
    if (process.env.NODE_ENV === 'production' && batchIndex < batches.length - 1) {
      console.log(`[CachedTokenBalances] ⏸️ Пауза между батчами...`)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  const totalTime = Date.now() - startTime
  console.log(`[CachedTokenBalances] 🏁 Все ${wallets.length} балансов получены за ${totalTime}ms`)
  
  return results
}

/**
 * Инвалидировать кэш балансов для определенного кошелька
 */
export function invalidateWalletCache(walletAddress: string): void {
  serverCache.invalidate(`token-balance:owner:${walletAddress}`)
} 