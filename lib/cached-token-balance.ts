// ✅ DEPRECATED: Этот файл больше не используется
// Вся функциональность кэширования балансов перенесена в:
// - /api/token-balances (серверный кэш)  
// - hooks/use-dashboard-balances.ts (клиентский кэш)

/**
 * @deprecated Используйте /api/token-balances напрямую
 */
export async function getCachedTokenBalance(): Promise<number> {
  console.warn('⚠️ getCachedTokenBalance DEPRECATED - используйте /api/token-balances')
  return 0
}

/**
 * @deprecated Используйте /api/token-balances напрямую
 */
export async function getCachedTokenBalances(): Promise<Map<string, number>> {
  console.warn('⚠️ getCachedTokenBalances DEPRECATED - используйте /api/token-balances')
  return new Map()
}

/**
 * @deprecated Больше не используется
 */
export function invalidateWalletCache(): void {
  console.warn('⚠️ invalidateWalletCache DEPRECATED')
} 