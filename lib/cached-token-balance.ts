// Кэшированная версия получения балансов SPL токенов
// Избегает дублирования запросов при высокой нагрузке

import { getSplTokenBalance } from './alchemy/solana'
import { serverCache, ServerCache } from './server-cache'

interface TokenBalanceParams {
  owner: string
  mint: string
  apiKey: string
}

/**
 * Получить баланс SPL токена с кэшированием
 */
export async function getCachedTokenBalance(params: TokenBalanceParams): Promise<number> {
  const cacheKey = ServerCache.createKey('token-balance', {
    owner: params.owner,
    mint: params.mint
  })
  
  return await serverCache.getOrFetch(
    cacheKey,
    async () => {
      const balance = await getSplTokenBalance(params)
      return balance ?? 0 // Возвращаем 0 если balance null
    },
    'TOKEN_BALANCE'
  )
}

/**
 * Получить балансы для нескольких кошельков одновременно с кэшированием
 */
export async function getCachedTokenBalances(
  wallets: string[],
  mint: string,
  apiKey: string
): Promise<Map<string, number>> {
  const results = new Map<string, number>()
  
  // Обрабатываем запросы параллельно
  const promises = wallets.map(async (wallet) => {
    try {
      const balance = await getCachedTokenBalance({ owner: wallet, mint, apiKey })
      return { wallet, balance }
    } catch (error) {
      console.error(`Error getting balance for ${wallet}:`, error)
      return { wallet, balance: 0 }
    }
  })
  
  const balances = await Promise.all(promises)
  
  // Заполняем карту результатов
  balances.forEach(({ wallet, balance }) => {
    results.set(wallet, balance)
  })
  
  return results
}

/**
 * Инвалидировать кэш балансов для определенного кошелька
 */
export function invalidateWalletCache(walletAddress: string): void {
  serverCache.invalidate(`token-balance:owner:${walletAddress}`)
} 