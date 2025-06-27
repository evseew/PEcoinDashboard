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

// Защита от перегрузки - отслеживание времени последних запросов
const lastBatchRequestTime = new Map<string, number>()
const MIN_BATCH_INTERVAL = process.env.NODE_ENV === 'production' ? 30000 : 10000 // 30 секунд для production, 10 для dev

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
 * ПРОСТАЯ И БЫСТРАЯ версия с защитой от перегрузки
 */
export async function getCachedTokenBalances(
  wallets: string[],
  mint: string,
  apiKey: string
): Promise<Map<string, number>> {
  const startTime = Date.now()
  const results = new Map<string, number>()
  
  // Защита от слишком частых batch запросов
  const batchKey = `${mint}:${wallets.length}`
  const lastRequestTime = lastBatchRequestTime.get(batchKey) || 0
  const timeSinceLastRequest = Date.now() - lastRequestTime
  
  if (timeSinceLastRequest < MIN_BATCH_INTERVAL) {
    const waitTime = MIN_BATCH_INTERVAL - timeSinceLastRequest
    console.log(`[CachedTokenBalances] ⏸️ Rate limiting: ожидание ${waitTime}ms`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  lastBatchRequestTime.set(batchKey, Date.now())
  
  console.log(`[CachedTokenBalances] 🚀 Запрос балансов для ${wallets.length} кошельков`)
  
  // Простые параллельные запросы без сложных батчей
  const promises = wallets.map(async (wallet) => {
    try {
      const balance = await getCachedTokenBalance({ owner: wallet, mint, apiKey })
      console.log(`[CachedTokenBalances] 💰 ${wallet.slice(0,8)}...: ${balance}`)
      return { wallet, balance }
    } catch (error) {
      console.error(`[CachedTokenBalances] ❌ Ошибка ${wallet.slice(0,8)}...:`, error)
      return { wallet, balance: 0 }
    }
  })
  
  const allResults = await Promise.all(promises)
  
  // Собираем результаты
  allResults.forEach(({ wallet, balance }) => {
    results.set(wallet, balance)
  })
  
  const totalTime = Date.now() - startTime
  console.log(`[CachedTokenBalances] ✅ Все ${wallets.length} балансов получены за ${totalTime}ms`)
  
  return results
}

/**
 * Инвалидировать кэш балансов для определенного кошелька
 */
export function invalidateWalletCache(walletAddress: string): void {
  serverCache.invalidate(`token-balance:${walletAddress}`)
} 