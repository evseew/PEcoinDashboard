// Кэширование Associated Token Account адресов для оптимизации
// Избегаем пересчёта ATA для одних и тех же пар wallet-mint

import { PublicKey } from '@solana/web3.js'

// ✅ ИСПРАВЛЕНО: Полностью изолируем от сервера
const ataCache = new Map<string, string>()

/**
 * ✅ Проверка, что мы на клиенте
 */
function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * ✅ Прямое вычисление ATA без кэширования (работает везде)
 */
function computeATA(mint: string, owner: string): string {
  try {
    // ✅ ИСПРАВЛЕНО: Пробуем сначала обычный SPL Token Program ID
    const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
    const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    
    const mintPubkey = new PublicKey(mint)
    const ownerPubkey = new PublicKey(owner)
    
    // ✅ ИСПРАВЛЕНО: PEcoin использует Token 2022 Program!
    const PECOIN_MINT = 'FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r'
    const TOKEN_PROGRAM_ID = (mint === PECOIN_MINT) ? TOKEN_2022_PROGRAM_ID : SPL_TOKEN_PROGRAM_ID
    
    const [associatedToken] = PublicKey.findProgramAddressSync(
      [
        ownerPubkey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
    
    const ataAddress = associatedToken.toBase58()
    
    // Логируем для дебага
    console.log(`[ATA] Computed for ${mint === PECOIN_MINT ? 'PEcoin' : 'Other'} ${owner.slice(0,8)}...: ${ataAddress.slice(0,8)}... (Program: ${TOKEN_PROGRAM_ID.toBase58().slice(0,8)}...)`)
    
    return ataAddress
  } catch (error) {
    console.error(`[ATA] ❌ Ошибка вычисления ATA для ${owner.slice(0,8)}...:`, error)
    throw error
  }
}

/**
 * ✅ Получить ATA адрес с кэшированием (только на клиенте)
 */
export async function getCachedATA(mint: string, owner: string): Promise<string> {
  // ✅ Строгая проверка - только на клиенте
  if (!isClient()) {
    throw new Error('ATA кэш доступен только на клиенте')
  }

  const cacheKey = `${mint}:${owner}`
  
  // Проверяем кэш
  const cached = ataCache.get(cacheKey)
  if (cached) {
    return cached
  }
  
  const ataAddress = computeATA(mint, owner)
  
  // Сохраняем в кэш
  ataCache.set(cacheKey, ataAddress)
  
  return ataAddress
}

/**
 * ✅ Batch вычисление ATA адресов (работает на сервере и клиенте)
 */
export async function getBatchCachedATAs(mint: string, owners: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  
  // ✅ ИСПРАВЛЕНО: Работаем и на сервере и на клиенте
  console.log(`[ATA Cache] 🚀 Batch вычисление ${owners.length} ATA адресов (${isClient() ? 'client' : 'server'})`)
  
  for (const owner of owners) {
    try {
      // Прямое вычисление ATA вместо getCachedATA для серверного использования
      const ataAddress = computeATA(mint, owner)
      results.set(owner, ataAddress)
    } catch (error) {
      console.warn(`[ATA Cache] ⚠️ Пропускаю ${owner.slice(0,8)}... из-за ошибки ATA:`, error)
    }
  }
  
  console.log(`[ATA Cache] ✅ Успешно вычислено ${results.size}/${owners.length} ATA адресов`)
  return results
}

/**
 * ✅ Предзагрузка ATA адресов для списка кошельков (только на клиенте)
 */
export async function precomputeATAs(mint: string, owners: string[]): Promise<void> {
  // ✅ Проверяем доступность на клиенте
  if (!isClient()) {
    console.log('[ATA Cache] ⚠️ Пропускаю предвычисление ATA на сервере')
    return
  }
  
  console.log(`[ATA Cache] 🚀 Предвычисляю ATA для ${owners.length} кошельков...`)
  
  const startTime = Date.now()
  let computed = 0
  
  for (const owner of owners) {
    try {
      await getCachedATA(mint, owner)
      computed++
    } catch (error) {
      console.warn(`[ATA Cache] ⚠️ Ошибка предвычисления для ${owner.slice(0,8)}...:`, error)
    }
  }
  
  const totalTime = Date.now() - startTime
  console.log(`[ATA Cache] ✅ Предвычислено ${computed}/${owners.length} ATA за ${totalTime}ms`)
}

/**
 * ✅ Статистика кэша
 */
export function getATACacheStats() {
  return {
    size: ataCache.size,
    keys: Array.from(ataCache.keys()).slice(0, 5) // Первые 5 ключей для дебага
  }
}

/**
 * ✅ Очистка кэша
 */
export function clearATACache(): void {
  const size = ataCache.size
  ataCache.clear()
  console.log(`[ATA Cache] 🗑️ Очищен кэш: удалено ${size} записей`)
} 