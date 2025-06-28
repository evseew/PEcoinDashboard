import { NextRequest, NextResponse } from 'next/server'

// Конфигурация RPC эндпоинтов для DAS API
const USER_RPC_URL = process.env.RPC_URL || process.env.ALCHEMY_URL || ""
const BACKUP_RPC_URLS = [
  USER_RPC_URL,
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
  "https://api.mainnet-beta.solana.com"
].filter(url => url && url.trim() !== "")

// Создание экземпляра для работы с RPC
function createRpcInstance(url: string) {
  return {
    url,
    async dasRequest(method: string, params: any) {
      const dasRequest = {
        jsonrpc: '2.0',
        id: 'batch-nft-counts',
        method,
        params
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dasRequest),
        signal: AbortSignal.timeout(8000) // Более короткий timeout для counts
      })
      
      if (!response.ok) {
        throw new Error(`RPC error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.error) {
        throw new Error(`DAS API error: ${data.error.message}`)
      }
      
      return data.result
    }
  }
}

// Кэш для NFT количества
const nftCountCache = new Map<string, { count: number, timestamp: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 минуты кэш для количества

function getCachedNFTCount(wallet: string): number | null {
  const cached = nftCountCache.get(wallet)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.count
  }
  nftCountCache.delete(wallet) // Удаляем устаревший кэш
  return null
}

function cacheNFTCount(wallet: string, count: number): void {
  nftCountCache.set(wallet, { count, timestamp: Date.now() })
}

// ✅ ОПТИМИЗИРОВАННАЯ ФУНКЦИЯ: Получение только количества NFT (без деталей)
async function getNFTCountForWallet(workingRpc: any, walletAddress: string): Promise<number> {
  try {
    // Получаем только первую страницу с минимальным лимитом для проверки наличия NFT
    const response = await workingRpc.dasRequest('getAssetsByOwner', {
      ownerAddress: walletAddress,
      page: 1,
      limit: 1000 // Большой лимит чтобы получить точное количество за один запрос
    })
    
    const total = response?.total || 0
    return total
  } catch (error) {
    console.warn(`[getNFTCountForWallet] Ошибка для ${walletAddress.slice(0,8)}...:`, error)
    return 0
  }
}

// POST - Batch получение количества NFT для множества кошельков
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { wallets } = await request.json()
    
    console.log(`[NFT Batch Counts] 🚀 Запрос количества NFT для ${wallets?.length || 0} кошельков`)

    if (!Array.isArray(wallets) || wallets.length === 0) {
      return NextResponse.json({
        success: true,
        counts: {},
        timing: { total: 0, walletsCount: 0 }
      })
    }

    // ✅ ПРОВЕРЯЕМ КЭШ ПЕРВЫМ ДЕЛОМ
    const cached: Record<string, number> = {}
    const missing: string[] = []
    
    for (const wallet of wallets) {
      const cachedCount = getCachedNFTCount(wallet)
      if (cachedCount !== null) {
        cached[wallet] = cachedCount
      } else {
        missing.push(wallet)
      }
    }
    
    console.log(`[NFT Batch Counts] 💾 Из кэша: ${Object.keys(cached).length}, загружаем: ${missing.length}`)

    if (missing.length === 0) {
      // Все в кэше!
      const totalTime = Date.now() - startTime
      console.log(`[NFT Batch Counts] 🎯 Все ${wallets.length} количеств из кэша за ${totalTime}ms`)
      
      return NextResponse.json({
        success: true,
        counts: cached,
        timing: { total: totalTime, walletsCount: wallets.length, fromCache: true }
      })
    }

    // Валидация недостающих кошельков
    const validWallets: string[] = []
    const results: Record<string, number> = { ...cached }

    for (const wallet of missing) {
      if (typeof wallet !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
        console.warn(`[NFT Batch Counts] ⚠️ Неверный формат адреса: ${wallet}`)
        results[wallet] = 0
        continue
      }
      validWallets.push(wallet)
    }

    if (validWallets.length === 0) {
      const totalTime = Date.now() - startTime
      return NextResponse.json({
        success: true,
        counts: results,
        timing: { total: totalTime, walletsCount: 0 }
      })
    }

    // Проверяем доступность RPC
    if (BACKUP_RPC_URLS.length === 0) {
      console.log('[NFT Batch Counts] ⚠️ Нет доступных RPC endpoints')
      validWallets.forEach(wallet => results[wallet] = 0)
      
      const totalTime = Date.now() - startTime
      return NextResponse.json({
        success: true,
        counts: results,
        timing: { total: totalTime, walletsCount: validWallets.length }
      })
    }

    // Находим рабочий RPC с поддержкой DAS API
    let workingRpc: any = null
    let rpcUsed = 'none'

    for (const rpcUrl of BACKUP_RPC_URLS) {
      try {
        const rpc = createRpcInstance(rpcUrl)
        
        // Быстрая проверка поддержки DAS API
        await rpc.dasRequest('getAssetsByOwner', {
          ownerAddress: "11111111111111111111111111111112",
          limit: 1
        })
        
        console.log(`[NFT Batch Counts] ✅ RPC поддерживает DAS API: ${rpcUrl}`)
        workingRpc = rpc
        rpcUsed = rpcUrl
        break
      } catch (error) {
        console.log(`[NFT Batch Counts] ❌ RPC не поддерживает DAS API: ${rpcUrl}`)
        continue
      }
    }

    if (!workingRpc) {
      console.log('[NFT Batch Counts] ⚠️ Ни один RPC не поддерживает DAS API')
      validWallets.forEach(wallet => results[wallet] = 0)
      
      const totalTime = Date.now() - startTime
      return NextResponse.json({
        success: true,
        counts: results,
        timing: { total: totalTime, walletsCount: validWallets.length }
      })
    }

    // ✅ ОПТИМИЗИРОВАННАЯ BATCH ОБРАБОТКА для counts (быстрее чем полные NFT)
    const BATCH_SIZE = 5 // Больший размер для counts (легче чем полные NFT)
    const batches: string[][] = []
    
    for (let i = 0; i < validWallets.length; i += BATCH_SIZE) {
      batches.push(validWallets.slice(i, i + BATCH_SIZE))
    }

    console.log(`[NFT Batch Counts] 📦 Разбито на ${batches.length} батчей по ≤${BATCH_SIZE} кошельков`)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const batchStart = Date.now()

      console.log(`[NFT Batch Counts] ⚡ Запрос батча ${batchIndex + 1}/${batches.length} (${batch.length} кошельков)`)

      // Параллельные запросы для текущего батча
      const batchPromises = batch.map(async (wallet) => {
        const count = await getNFTCountForWallet(workingRpc, wallet)
        return { wallet, count }
      })

      // Выполняем параллельные запросы с timeout
      const batchResults = await Promise.allSettled(
        batchPromises.map(p => Promise.race([
          p,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 6000))
        ]))
      )

      // Обрабатываем результаты батча
      batchResults.forEach((result, index) => {
        const wallet = batch[index]
        if (result.status === 'fulfilled') {
          const { count } = result.value as { wallet: string, count: number }
          results[wallet] = count
          
          // ✅ КЭШИРУЕМ РЕЗУЛЬТАТ
          cacheNFTCount(wallet, count)
          
          console.log(`[NFT Batch Counts] 💰 ${wallet.slice(0,8)}... -> ${count} NFT`)
        } else {
          console.warn(`[NFT Batch Counts] ⚠️ Неудачный запрос для ${wallet.slice(0,8)}...`)
          results[wallet] = 0
        }
      })

      const batchTime = Date.now() - batchStart
      console.log(`[NFT Batch Counts] ✅ Батч ${batchIndex + 1}/${batches.length} обработан за ${batchTime}ms`)

      // Короткая пауза между батчами
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    const totalTime = Date.now() - startTime
    const totalNFTs = Object.values(results).reduce((sum, count) => sum + count, 0)
    
    console.log(`[NFT Batch Counts] 🎉 ЗАВЕРШЕНО: ${Object.keys(results).length} кошельков, ${totalNFTs} NFT за ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      counts: results,
      totalNFTs,
      timing: { 
        total: totalTime, 
        walletsCount: validWallets.length,
        averagePerWallet: validWallets.length > 0 ? Math.round(totalTime / validWallets.length * 100) / 100 : 0,
        cacheHits: Object.keys(cached).length
      },
      meta: {
        rpcUsed,
        supportsDAS: true,
        cacheSize: nftCountCache.size
      }
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`[NFT Batch Counts] ❌ Критическая ошибка за ${totalTime}ms:`, error)
    
    return NextResponse.json({
      success: false,
      error: 'Не удалось получить количество NFT',
      counts: {},
      timing: { total: totalTime, walletsCount: 0 }
    }, { status: 500 })
  }
} 