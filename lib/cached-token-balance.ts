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
 * ОПТИМИЗИРОВАНО для высокой производительности
 */
export async function getCachedTokenBalances(
  wallets: string[],
  mint: string,
  apiKey: string
): Promise<Map<string, number>> {
  const startTime = Date.now()
  const results = new Map<string, number>()
  
  console.log(`[CachedTokenBalances] 🚀 УСКОРЕННЫЙ запрос ${wallets.length} балансов`)
  
  // ЗНАЧИТЕЛЬНО увеличиваем размер батчей для ускорения
  const BATCH_SIZE = process.env.NODE_ENV === 'production' ? 12 : 20 // Было: 3:8
  const MAX_PARALLEL_BATCHES = process.env.NODE_ENV === 'production' ? 3 : 4 // Параллельно обрабатываем несколько батчей
  
  const batches = []
  for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
    batches.push(wallets.slice(i, i + BATCH_SIZE))
  }
  
  console.log(`[CachedTokenBalances] ⚡ Обрабатываю ${wallets.length} кошельков в ${batches.length} батчах по ${BATCH_SIZE} (${MAX_PARALLEL_BATCHES} параллельно)`)
  
  // НОВЫЙ ПОДХОД: Обрабатываем несколько батчей параллельно
  for (let i = 0; i < batches.length; i += MAX_PARALLEL_BATCHES) {
    const parallelBatches = batches.slice(i, i + MAX_PARALLEL_BATCHES)
    const batchStart = Date.now()
    
    console.log(`[CachedTokenBalances] 🎯 Параллельная группа ${Math.floor(i/MAX_PARALLEL_BATCHES) + 1}: ${parallelBatches.length} батчей`)
    
    // Обрабатываем батчи параллельно
    const parallelResults = await Promise.all(
      parallelBatches.map(async (batch, batchIndex) => {
        const actualBatchIndex = i + batchIndex
        console.log(`[CachedTokenBalances] 🔥 Batch ${actualBatchIndex + 1}/${batches.length}: ${batch.length} кошельков`)
        
        // Внутри каждого батча тоже параллельно
        const batchPromises = batch.map(async (wallet) => {
          const walletStart = Date.now()
          try {
            const balance = await getCachedTokenBalance({ owner: wallet, mint, apiKey })
            const walletTime = Date.now() - walletStart
            console.log(`[CachedTokenBalances] 💰 ${wallet.slice(0,8)}...: ${balance} (${walletTime}ms)`)
            return { wallet, balance }
          } catch (error) {
            const walletTime = Date.now() - walletStart
            console.error(`[CachedTokenBalances] ❌ Ошибка ${wallet.slice(0,8)}... за ${walletTime}ms:`, error)
            return { wallet, balance: 0 }
          }
        })
        
        return await Promise.all(batchPromises)
      })
    )
    
    // Собираем результаты из всех параллельных батчей
    parallelResults.flat().forEach(({ wallet, balance }) => {
      results.set(wallet, balance)
    })
    
    const batchTime = Date.now() - batchStart
    console.log(`[CachedTokenBalances] ✅ Параллельная группа завершена за ${batchTime}ms`)
    
    // Минимальная пауза только между группами параллельных батчей (не между отдельными батчами)
    if (i + MAX_PARALLEL_BATCHES < batches.length) {
      console.log(`[CachedTokenBalances] ⏸️ Микропауза между группами...`)
      await new Promise(resolve => setTimeout(resolve, 100)) // Уменьшено с 500мс до 100мс
    }
  }
  
  const totalTime = Date.now() - startTime
  console.log(`[CachedTokenBalances] 🏁 УСКОРЕНО! Все ${wallets.length} балансов получены за ${totalTime}ms`)
  
  return results
}

/**
 * Инвалидировать кэш балансов для определенного кошелька
 */
export function invalidateWalletCache(walletAddress: string): void {
  serverCache.invalidate(`token-balance:${walletAddress}`)
} 