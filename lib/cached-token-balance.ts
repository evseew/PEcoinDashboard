// Кэшированная версия получения балансов SPL токенов
// Простая и быстрая версия без rate limiting

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
 * ПРОСТАЯ И БЫСТРАЯ версия без rate limiting
 */
export async function getCachedTokenBalances(
  wallets: string[],
  mint: string,
  apiKey: string
): Promise<Map<string, number>> {
  const startTime = Date.now()
  const results = new Map<string, number>()
  
  console.log(`[CachedTokenBalances] 🚀 Запрос балансов для ${wallets.length} кошельков`)
  
  // Простые параллельные запросы без rate limiting
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