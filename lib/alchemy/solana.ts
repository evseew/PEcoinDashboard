// Получение метаданных токена Solana через Alchemy RPC с кэшированием
// https://docs.alchemy.com/reference/gettokenmetadata

import { getCachedATA, getBatchCachedATAs } from '@/lib/ata-cache'
import { PublicKey } from '@solana/web3.js'

// Простой in-memory кэш (на время жизни процесса)
const tokenMetaCache = new Map<string, { image?: string; uri?: string; ts: number }>()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 часов

// Универсальные функции для получения ключа и URL Alchemy
export function getAlchemyKey() {
  const env = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";
  if (env.startsWith("https://")) {
    return env.split("/").pop() || "";
  }
  return env;
}

export function getAlchemyUrl() {
  const key = getAlchemyKey()
  if (!key) {
    console.warn("[Alchemy] ALCHEMY_API_KEY не найден. Запросы к Alchemy RPC будут неудачными.")
    // Возвращаем URL с плейсхолдером, чтобы избежать полного падения, но запросы не пройдут
    return `https://solana-mainnet.g.alchemy.com/v2/demo`
  }
  return `https://solana-mainnet.g.alchemy.com/v2/${key}`
}

/**
 * Получить баланс SPL токена для кошелька - УСКОРЕННАЯ ВЕРСИЯ
 */
export async function getTokenBalance(owner: string, mint: string, apiKey: string): Promise<number> {
  const startTime = Date.now()
  const url = `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`;
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [
      owner,
      { mint },
      { encoding: "jsonParsed" }
    ]
  };

  const MAX_RETRIES = 2
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now()
    
    try {
      console.log(`[Alchemy] ⚡ Быстрый запрос ${attempt}/${MAX_RETRIES} для ${owner.slice(0,8)}...`)
      
      const controller = new AbortController()
      // ✅ УМЕНЬШЕНО: 3 секунды вместо 5 для быстрого ответа
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json();
      const attemptTime = Date.now() - attemptStart
      
      if (data.error) {
        console.error(`[Alchemy] ❌ API Error для ${owner.slice(0,8)}... за ${attemptTime}ms:`, data.error);
        throw new Error(`Alchemy API error: ${data.error.message || data.error}`);
      }
      
      const accounts = data.result?.value || [];
      let totalBalance = 0;
      
      for (const account of accounts) {
        const balance = account.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
        totalBalance += balance;
      }
      
      const totalTime = Date.now() - startTime
      console.log(`[Alchemy] ✅ Баланс ${totalBalance} для ${owner.slice(0,8)}... за ${totalTime}ms (попытка ${attempt})`)
      
      return totalBalance;
      
    } catch (error) {
      const attemptTime = Date.now() - attemptStart
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[Alchemy] ⏰ Timeout ${attemptTime}ms для ${owner.slice(0,8)}... (попытка ${attempt})`)
      } else {
        console.warn(`[Alchemy] ⚠️ Ошибка ${attemptTime}ms для ${owner.slice(0,8)}... (попытка ${attempt}):`, error)
      }
      
      // Если это последняя попытка, бросаем ошибку
      if (attempt === MAX_RETRIES) {
        const totalTime = Date.now() - startTime
        console.error(`[Alchemy] ❌ Все попытки исчерпаны для ${owner.slice(0,8)}... за ${totalTime}ms`)
        throw lastError
      }
      
      // ✅ УМЕНЬШЕНА пауза между попытками для скорости
      await new Promise(resolve => setTimeout(resolve, 150 * attempt)) // Было: 300 * attempt
    }
  }
  
  // Этот код никогда не должен выполниться, но для TypeScript
  throw lastError || new Error('Unknown error')
}

/**
 * Получить баланс SPL токена (альтернативный метод для совместимости)
 */
export async function getSplTokenBalance({
  owner,
  mint
}: {
  owner: string
  mint: string
}): Promise<number> {
  const apiKey = getAlchemyKey()
  return getTokenBalance(owner, mint, apiKey)
}

/**
 * Получить метаданные токена
 */
export async function getTokenMetadata(mintAddress: string): Promise<{ image?: string; uri?: string } | null> {
  try {
    // Проверяем кэш
    const cached = tokenMetaCache.get(mintAddress)
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return { image: cached.image, uri: cached.uri }
    }

    // ✅ ИСПРАВЛЕНО: Используем правильный URL с API ключом
    const apiKey = getAlchemyKey()
    if (!apiKey) {
      console.warn('[TokenMetadata] ⚠️ Alchemy API ключ не настроен')
      return null
    }
    
    const url = `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAsset',  // ✅ ИСПРАВЛЕНО: Используем getAsset вместо getTokenMetadata
        params: {
          id: mintAddress
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
      console.error('[TokenMetadata] ❌ Alchemy API error:', data.error)
      return null
    }

    const metadata = data.result
    const result = {
      image: metadata?.content?.links?.image || metadata?.content?.metadata?.image,
      uri: metadata?.content?.json_uri
    }

    // Сохраняем в кэш только если есть данные
    if (result.image || result.uri) {
      tokenMetaCache.set(mintAddress, {
        image: result.image,
        uri: result.uri,
        ts: Date.now()
      })
    }

    return result
  } catch (error) {
    console.error('[TokenMetadata] ❌ Error fetching token metadata:', error)
    return null
  }
}

/**
 * Получить все SPL token accounts пользователя для конкретного mint (например, PEcoin)
 */
export async function getUserTokenAccounts({
  owner,
  mint,
  apiKey
}: {
  owner: string;
  mint: string;
  apiKey?: string;
}): Promise<string[]> {
  const key = apiKey ? (apiKey.startsWith("https://") ? apiKey.split("/").pop() : apiKey) : getAlchemyKey();
  if (!key) return [];
  const url = `https://solana-mainnet.g.alchemy.com/v2/${key}`;

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [
      owner,
      { mint },
      { encoding: "jsonParsed" }
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000) // 5 секунд timeout
    });
    const data = await res.json();
    if (data.result && data.result.value && data.result.value.length > 0) {
      return data.result.value.map((acc: any) => acc.pubkey);
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Вычисление Associated Token Account адреса локально
 * Без RPC вызовов - максимально быстро!
 * 🔥 ИСПРАВЛЕНО: Используем правильный Program ID для каждого токена!
 */
export function getAssociatedTokenAddress(mint: string, owner: string): string {
  try {
    // ✅ ИСПРАВЛЕНО: Определяем Program ID по типу токена
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
    
    return associatedToken.toBase58()
  } catch (error) {
    console.error(`[ATA] ❌ Ошибка вычисления ATA для ${owner.slice(0,8)}...:`, error)
    throw error
  }
}

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Batch получение балансов через getMultipleAccounts
 * Оптимизированная версия вместо множественных getTokenAccountsByOwner
 */
export async function getMultipleTokenBalances(
  wallets: string[],
  mint: string,
  apiKey: string
): Promise<Map<string, number>> {
  const startTime = Date.now()
  const results = new Map<string, number>()
  
  if (wallets.length === 0) {
    return results
  }
  
  console.log(`[Alchemy Batch] 🚀 Batch загрузка ${wallets.length} балансов через getMultipleAccounts`)
  
  try {
    // 1. ✅ ОПТИМИЗИРОВАНО: Используем кэшированные ATA адреса
    console.log(`[Alchemy Batch] 💾 Получаю кэшированные ATA адреса...`)
    const ataMap = await getBatchCachedATAs(mint, wallets) // wallet -> ata
    const ataAddresses: string[] = Array.from(ataMap.values())
    
    // Устанавливаем 0 для кошельков с ошибками ATA
    for (const wallet of wallets) {
      if (!ataMap.has(wallet)) {
        results.set(wallet, 0)
      }
    }
    
    if (ataAddresses.length === 0) {
      console.log(`[Alchemy Batch] ❌ Нет валидных ATA адресов`)
      return results
    }
    
    // 2. Разбиваем на chunks по 50 аккаунтов (уменьшено с 100 для быстрого ответа)
    const chunks: string[][] = []
    for (let i = 0; i < ataAddresses.length; i += 50) {
      chunks.push(ataAddresses.slice(i, i + 50))
    }
    
    console.log(`[Alchemy Batch] 📦 Разбито на ${chunks.length} чанков по ≤50 аккаунтов для быстроты`)
    
    // 3. Делаем batch запросы getMultipleAccounts
    const url = `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex]
      const chunkStart = Date.now()
      
      try {
        console.log(`[Alchemy Batch] ⚡ Запрос чанка ${chunkIndex + 1}/${chunks.length} (${chunk.length} аккаунтов)`)
        
        const controller = new AbortController()
        // ✅ УМЕНЬШЕНО: 7 секунд вместо 15 для быстрого batch ответа
        const timeoutId = setTimeout(() => controller.abort(), 7000)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: chunkIndex + 1,
            method: 'getMultipleAccounts',
            params: [
              chunk,
              {
                encoding: 'jsonParsed',
                commitment: 'confirmed' // ✅ ДОБАВЛЕНО: confirmed быстрее чем finalized
              }
            ]
          }),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        const chunkTime = Date.now() - chunkStart
        
        if (data.error) {
          console.error(`[Alchemy Batch] ❌ RPC Error для чанка ${chunkIndex + 1}:`, data.error)
          throw new Error(`RPC error: ${data.error.message || data.error}`)
        }
        
        // 4. Парсим результаты
        const accounts = data.result?.value || []
        console.log(`[Alchemy Batch] 🔍 Получено ${accounts.length} аккаунтов в чанке ${chunkIndex + 1}`)
        
        for (let i = 0; i < chunk.length; i++) {
          const ataAddress = chunk[i]
          const account = accounts[i]
          
          // Найдем wallet по ATA адресу
          let wallet: string | undefined
          for (const [w, ata] of ataMap.entries()) {
            if (ata === ataAddress) {
              wallet = w
              break
            }
          }
          
          if (!wallet) {
            console.warn(`[Alchemy Batch] ⚠️ Не найден wallet для ATA ${ataAddress}`)
            continue
          }
          
          if (account === null) {
            // ATA не существует = 0 баланс
            console.log(`[Alchemy Batch] 💰 ${wallet.slice(0,8)}... -> 0 (ATA не существует)`)
            results.set(wallet, 0)
          } else {
            // Парсим баланс из jsonParsed данных
            const balance = account.data?.parsed?.info?.tokenAmount?.uiAmount || 0
            console.log(`[Alchemy Batch] 💰 ${wallet.slice(0,8)}... -> ${balance} (ATA: ${ataAddress.slice(0,8)}...)`)
            results.set(wallet, balance)
          }
        }
        
        console.log(`[Alchemy Batch] ✅ Чанк ${chunkIndex + 1}/${chunks.length} обработан за ${chunkTime}ms`)
        
      } catch (error) {
        const chunkTime = Date.now() - chunkStart
        console.error(`[Alchemy Batch] ❌ Ошибка чанка ${chunkIndex + 1} за ${chunkTime}ms:`, error)
        
        // Устанавливаем 0 для всех кошельков в этом чанке
        for (const ataAddress of chunk) {
          for (const [wallet, ata] of ataMap.entries()) {
            if (ata === ataAddress) {
              results.set(wallet, 0)
              break
            }
          }
        }
      }
    }
    
    const totalTime = Date.now() - startTime
    console.log(`[Alchemy Batch] 🎉 ЗАВЕРШЕНО: ${results.size}/${wallets.length} балансов за ${totalTime}ms`)
    
    return results
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[Alchemy Batch] ❌ Критическая ошибка за ${totalTime}ms:`, error)
    
    // Fallback: устанавливаем 0 для всех кошельков
    wallets.forEach(wallet => results.set(wallet, 0))
    return results
  }
} 