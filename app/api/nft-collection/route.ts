import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { getCachedBatchNFTResults, cacheBatchNFTResults } from '@/lib/server-cache'

// Временно используем обычный клиент (RLS отключен для nft_collections)
// TODO: переключиться на createServerClient когда настроен SUPABASE_SERVICE_ROLE_KEY

// Конфигурация RPC эндпоинтов для DAS API
const USER_RPC_URL = process.env.RPC_URL || process.env.ALCHEMY_URL || ""
const MAIN_RPC_URL = "https://api.mainnet-beta.solana.com"
const BACKUP_RPC_URLS = [
  USER_RPC_URL, // Пользовательский RPC первым (обычно поддерживает DAS API)
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
  MAIN_RPC_URL
].filter(url => url && url.trim() !== "") // Удаляем пустые URL

// Создание экземпляра для работы с RPC
function createRpcInstance(url: string) {
  return {
    url,
    async dasRequest(method: string, params: any) {
      const dasRequest = {
        jsonrpc: '2.0',
        id: 'get-wallet-nfts',
        method,
        params
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dasRequest),
        signal: AbortSignal.timeout(15000)
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

// Функция для получения NFT кошелька
async function handleGetNFTsByWallet(walletAddress: string): Promise<NextResponse> {
  try {
    console.log(`[handleGetNFTsByWallet] Получение NFT для кошелька: ${walletAddress}`)

    // Проверка наличия необходимых переменных окружения
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[handleGetNFTsByWallet] ❌ Отсутствуют переменные окружения Supabase')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Сервис не настроен - отсутствуют переменные окружения Supabase',
          count: 0,
          nfts: []
        },
        { status: 500 }
      )
    }

    // Валидация адреса кошелька
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат адреса кошелька Solana' },
        { status: 400 }
      )
    }

    const allNFTs: any[] = []
    let rpcUsed = 'none'
    let supportsDAS = false

    // Если нет доступных RPC endpoints, возвращаем пустой результат
    if (BACKUP_RPC_URLS.length === 0) {
      console.log('[handleGetNFTsByWallet] ⚠️ Нет доступных RPC endpoints - возвращаем пустой результат')
      return NextResponse.json({
        success: true,
        nfts: [],
        count: 0,
        meta: {
          rpcUsed: 'none',
          supportsDAS: false,
          walletAddress,
          warning: 'RPC endpoints не настроены'
        }
      })
    }

    // Пробуем разные RPC endpoints для получения NFT через DAS API
    for (const rpcUrl of BACKUP_RPC_URLS) {
      try {
        console.log(`[handleGetNFTsByWallet] Пробуем RPC: ${rpcUrl}`)
        const rpc = createRpcInstance(rpcUrl)
        
        // Проверяем поддержку DAS API
        await rpc.dasRequest('getAssetsByOwner', {
          ownerAddress: "11111111111111111111111111111112", // System program как тестовый адрес
          limit: 1
        })
        
        console.log(`[handleGetNFTsByWallet] ✅ DAS API поддерживается`)
        supportsDAS = true
        rpcUsed = rpcUrl

        // Получаем NFT кошелька через DAS API
        let page = 1
        let hasMore = true
        
        while (hasMore && page <= 5) { // Ограничиваем 5 страницами для безопасности
          const response = await rpc.dasRequest('getAssetsByOwner', {
            ownerAddress: walletAddress,
            page: page,
            limit: 50 // Получаем по 50 NFT за раз
          })
          
          const assets = response?.items || []
          console.log(`[handleGetNFTsByWallet] Страница ${page}: найдено ${assets.length} ассетов`)
          
          for (const asset of assets) {
            // Обрабатываем как обычные, так и compressed NFT
            const nft = {
              id: asset.id,
              mintAddress: asset.id,
              name: asset.content?.metadata?.name || 'Без названия',
              description: asset.content?.metadata?.description || 'Без описания',
              image: asset.content?.links?.image || asset.content?.metadata?.image || null,
              collection: getCollectionName(asset),
              symbol: asset.content?.metadata?.symbol || 'NFT',
              uri: asset.content?.json_uri || null,
              attributes: asset.content?.metadata?.attributes || [],
              isCompressed: asset.compression?.compressed === true,
              treeId: asset.compression?.tree || null
            }
            
            allNFTs.push(nft)
          }
          
          // Проверяем есть ли еще страницы
          hasMore = assets.length === 50 && response?.total > page * 50
          page++
        }
        
        console.log(`[handleGetNFTsByWallet] ✅ Всего найдено ${allNFTs.length} NFT`)
        break // Если успешно получили данные, выходим из цикла
        
      } catch (error: any) {
        console.log(`[handleGetNFTsByWallet] ❌ RPC ${rpcUrl} не поддерживает DAS API: ${error.message}`)
        continue // Пробуем следующий RPC
      }
    }

    // Если ни один RPC не сработал, но это не критично - возвращаем пустой результат
    if (!supportsDAS) {
      console.log('[handleGetNFTsByWallet] ⚠️ Ни один RPC не поддерживает DAS API - возвращаем пустой результат')
      return NextResponse.json({
        success: true,
        nfts: [],
        count: 0,
        meta: {
          rpcUsed: 'none',
          supportsDAS: false,
          walletAddress,
          warning: 'DAS API недоступен'
        }
      })
    }

    return NextResponse.json({
      success: true,
      nfts: allNFTs,
      count: allNFTs.length,
      meta: {
        rpcUsed,
        supportsDAS,
        walletAddress
      }
    })

  } catch (error: any) {
    console.error('[handleGetNFTsByWallet] Ошибка:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Не удалось загрузить NFT коллекцию',
        details: error.message,
        nfts: [], // Возвращаем пустой массив для совместимости
        count: 0
      },
      { status: 500 }
    )
  }
}

// Вспомогательная функция для получения названия коллекции
function getCollectionName(asset: any): string {
  // Ищем grouping с collection
  const collectionGrouping = asset.grouping?.find((g: any) => g.group_key === 'collection')
  if (collectionGrouping) {
    return collectionGrouping.group_value || 'Неизвестная коллекция'
  }
  
  // Fallback на metadata
  if (asset.content?.metadata?.collection?.name) {
    return asset.content.metadata.collection.name
  }
  
  // Последний fallback
  return asset.compression?.compressed === true ? 'Compressed Collection' : 'Неизвестная коллекция'
}

interface NFTCollection {
  id: string
  name: string
  description: string
  symbol: string
  tree_address: string
  collection_address?: string
  creator_address?: string
  capacity: number
  minted: number
  depth?: number
  buffer_size?: number
  image_url?: string
  external_url?: string
  metadata_json?: any
  has_valid_tree: boolean
  supports_das: boolean
  rpc_used?: string
  status: 'active' | 'paused' | 'completed'
  is_public: boolean
  allow_minting: boolean
  created_at: string
  updated_at: string
  imported_at: string
  last_sync_at?: string
}

// GET - получение всех коллекций
export async function GET() {
  try {
    console.log('[API] Получение списка коллекций')

    const { data: collections, error } = await supabase
      .from('nft_collections')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] Ошибка получения коллекций:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API] ✅ Загружено ${collections?.length || 0} коллекций`)

    return NextResponse.json({
      success: true,
      collections: collections || [],
      total: collections?.length || 0
    })

  } catch (error: any) {
    console.error('[API] Критическая ошибка:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Не удалось загрузить коллекции' },
      { status: 500 }
    )
  }
}

// POST - создание новой коллекции ИЛИ получение NFT для кошелька/кошельков
export async function POST(request: NextRequest) {
  try {
    console.log('[API POST] Получен запрос')
    const requestData = await request.json()
    console.log('[API POST] Данные запроса:', requestData)

    // ✅ НОВОЕ: Batch запрос NFT для множества кошельков
    if (requestData.wallets && Array.isArray(requestData.wallets)) {
      console.log('[API POST] 🚀 Обработка BATCH запроса NFT для кошельков:', requestData.wallets.length)
      return await handleGetNFTsBatch(requestData.wallets)
    }

    // Если запрос содержит walletAddress - возвращаем NFT этого кошелька
    if (requestData.walletAddress) {
      console.log('[API POST] Обработка запроса NFT для кошелька:', requestData.walletAddress)
      return await handleGetNFTsByWallet(requestData.walletAddress)
    }

    // Иначе обрабатываем как создание коллекции
    const collectionData = requestData

    console.log('[API] Добавление новой коллекции:', {
      name: collectionData.name,
      treeAddress: collectionData.treeAddress,
      hasImage: !!collectionData.image,
      imageUrl: collectionData.image
    })

    // Валидация обязательных полей
    if (!collectionData.name || !collectionData.treeAddress) {
      return NextResponse.json(
        { success: false, error: 'Имя коллекции и адрес дерева обязательны' },
        { status: 400 }
      )
    }

    // Валидация формата tree address
    if (!/^[1-9A-HJ-NP-Za-km-z]{44}$/.test(collectionData.treeAddress)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат адреса дерева Solana' },
        { status: 400 }
      )
    }

    // Проверка на дублирование tree address
    const { data: existingCollection } = await supabase
      .from('nft_collections')
      .select('id, name')
      .eq('tree_address', collectionData.treeAddress)
      .single()

    if (existingCollection) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Коллекция с адресом дерева ${collectionData.treeAddress} уже существует (${existingCollection.name})` 
        },
        { status: 409 }
      )
    }

    // Подготовка данных для вставки
    const insertData = {
      name: collectionData.name,
      description: collectionData.description || '',
      symbol: collectionData.symbol || 'cNFT',
      tree_address: collectionData.treeAddress,
      collection_address: collectionData.collectionAddress || null,
      creator_address: collectionData.creator || null,
      capacity: collectionData.capacity || 1024,
      minted: collectionData.minted || 0,
      depth: collectionData.depth || 20,
      buffer_size: collectionData.bufferSize || 64,
      image_url: collectionData.image || null,
      external_url: collectionData.externalUrl || null,
      metadata_json: collectionData.metadata || null,
      has_valid_tree: collectionData.hasValidTree || false,
      supports_das: collectionData.supportsDAS || false,
      rpc_used: collectionData.rpcUsed || null,
      status: collectionData.status || 'active',
      is_public: collectionData.isPublic !== undefined ? collectionData.isPublic : true,
      allow_minting: collectionData.allowMinting !== undefined ? collectionData.allowMinting : true,
      imported_at: new Date().toISOString(),
      last_sync_at: collectionData.minted > 0 ? new Date().toISOString() : null // Устанавливаем если есть NFT
    }

    // Вставка в базу данных
    const { data: newCollection, error } = await supabase
      .from('nft_collections')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('[API] Ошибка при добавлении коллекции:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API] ✅ Коллекция успешно добавлена:`, {
      id: newCollection.id,
      name: newCollection.name,
      treeAddress: newCollection.tree_address
    })

    return NextResponse.json({
      success: true,
      collection: newCollection,
      message: `Коллекция "${newCollection.name}" успешно добавлена`
    })

  } catch (error: any) {
    console.error('[API] Ошибка при добавлении коллекции:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Не удалось добавить коллекцию' },
      { status: 500 }
    )
  }
}

// PUT - обновление существующей коллекции
export async function PUT(request: NextRequest) {
  try {
    const { id, ...updateData } = await request.json()

    console.log('[API] Обновление коллекции:', { id, updates: Object.keys(updateData) })

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID коллекции обязателен для обновления' },
        { status: 400 }
      )
    }

    // Подготовка данных для обновления (убираем undefined значения)
    const cleanedUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    // Всегда обновляем updated_at при любом изменении
    cleanedUpdateData.updated_at = new Date().toISOString()

    // Если есть tree_address, проверяем на дублирование
    if (cleanedUpdateData.tree_address) {
      const { data: existingCollection } = await supabase
        .from('nft_collections')
        .select('id')
        .eq('tree_address', cleanedUpdateData.tree_address)
        .neq('id', id)
        .single()

      if (existingCollection) {
        return NextResponse.json(
          { success: false, error: 'Коллекция с таким адресом дерева уже существует' },
          { status: 409 }
        )
      }
    }

    // Обновление в базе данных
    const { data: updatedCollection, error } = await supabase
      .from('nft_collections')
      .update(cleanedUpdateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[API] Ошибка при обновлении коллекции:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    if (!updatedCollection) {
      return NextResponse.json(
        { success: false, error: 'Коллекция не найдена' },
        { status: 404 }
      )
    }

    console.log(`[API] ✅ Коллекция обновлена:`, {
      id: updatedCollection.id,
      name: updatedCollection.name
    })

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
      message: `Коллекция "${updatedCollection.name}" успешно обновлена`
    })

  } catch (error: any) {
    console.error('[API] Ошибка при обновлении коллекции:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Не удалось обновить коллекцию' },
      { status: 500 }
    )
  }
}

// DELETE - удаление коллекции
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    console.log('[API] Удаление коллекции:', { id })

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID коллекции обязателен для удаления' },
        { status: 400 }
      )
    }

    // Получаем информацию о коллекции перед удалением
    const { data: collectionToDelete } = await supabase
      .from('nft_collections')
      .select('name, tree_address')
      .eq('id', id)
      .single()

    if (!collectionToDelete) {
      return NextResponse.json(
        { success: false, error: 'Коллекция не найдена' },
        { status: 404 }
      )
    }

    // Удаление из базы данных
    const { error } = await supabase
      .from('nft_collections')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[API] Ошибка при удалении коллекции:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API] ✅ Коллекция удалена:`, {
      id,
      name: collectionToDelete.name,
      treeAddress: collectionToDelete.tree_address
    })

    return NextResponse.json({
      success: true,
      message: `Коллекция "${collectionToDelete.name}" успешно удалена`
    })

  } catch (error: any) {
    console.error('[API] Ошибка при удалении коллекции:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Не удалось удалить коллекцию' },
      { status: 500 }
    )
  }
}

// ✅ НОВАЯ ФУНКЦИЯ: Batch получение NFT для множества кошельков
async function handleGetNFTsBatch(wallets: string[]): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    console.log(`[handleGetNFTsBatch] 🚀 Batch получение NFT для ${wallets.length} кошельков`)

    if (wallets.length === 0) {
      return NextResponse.json({
        success: true,
        results: {},
        timing: { total: 0, walletsCount: 0 }
      })
    }

    // ✅ ПРОВЕРЯЕМ КЭШ: Может часть результатов уже есть
    const { cached, missing } = getCachedBatchNFTResults(wallets)
    
    if (missing.length === 0) {
      // Все результаты в кэше!
      const totalTime = Date.now() - startTime
      console.log(`[handleGetNFTsBatch] 🎯 Все ${wallets.length} NFT результатов из кэша за ${totalTime}ms`)
      
      return NextResponse.json({
        success: true,
        results: cached,
        timing: { total: totalTime, walletsCount: wallets.length, fromCache: true }
      })
    }
    
    console.log(`[handleGetNFTsBatch] 💾 Из кэша: ${Object.keys(cached).length}, загружаем: ${missing.length}`)

    // Валидация только отсутствующих в кэше адресов кошельков
    const validWallets: string[] = []
    const results: Record<string, any> = { ...cached } // Начинаем с кэшированных результатов

    for (const wallet of missing) {
      if (typeof wallet !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
        console.warn(`[handleGetNFTsBatch] ⚠️ Неверный формат адреса: ${wallet}`)
        results[wallet] = { success: false, nfts: [], count: 0, error: 'Неверный формат адреса' }
        continue
      }
      validWallets.push(wallet)
    }

    if (validWallets.length === 0) {
      const totalTime = Date.now() - startTime
      return NextResponse.json({
        success: true,
        results,
        timing: { total: totalTime, walletsCount: 0 }
      })
    }

    console.log(`[handleGetNFTsBatch] 📋 Валидных кошельков: ${validWallets.length}/${wallets.length}`)

    // Проверяем доступность RPC endpoints
    if (BACKUP_RPC_URLS.length === 0) {
      console.log('[handleGetNFTsBatch] ⚠️ Нет доступных RPC endpoints')
      validWallets.forEach(wallet => {
        results[wallet] = { success: true, nfts: [], count: 0, warning: 'RPC endpoints не настроены' }
      })
      const totalTime = Date.now() - startTime
      return NextResponse.json({
        success: true,
        results,
        timing: { total: totalTime, walletsCount: validWallets.length }
      })
    }

    // Выбираем первый рабочий RPC с поддержкой DAS API
    let workingRpc: any = null
    let rpcUsed = 'none'

    for (const rpcUrl of BACKUP_RPC_URLS) {
      try {
        console.log(`[handleGetNFTsBatch] 🔍 Проверяем RPC: ${rpcUrl}`)
        const rpc = createRpcInstance(rpcUrl)
        
        // Проверяем поддержку DAS API
        await rpc.dasRequest('getAssetsByOwner', {
          ownerAddress: "11111111111111111111111111111112",
          limit: 1
        })
        
        console.log(`[handleGetNFTsBatch] ✅ RPC поддерживает DAS API: ${rpcUrl}`)
        workingRpc = rpc
        rpcUsed = rpcUrl
        break
      } catch (error) {
        console.log(`[handleGetNFTsBatch] ❌ RPC не поддерживает DAS API: ${rpcUrl}`)
        continue
      }
    }

    if (!workingRpc) {
      console.log('[handleGetNFTsBatch] ⚠️ Ни один RPC не поддерживает DAS API')
      validWallets.forEach(wallet => {
        results[wallet] = { success: true, nfts: [], count: 0, warning: 'DAS API недоступен' }
      })
      const totalTime = Date.now() - startTime
      return NextResponse.json({
        success: true,
        results,
        timing: { total: totalTime, walletsCount: validWallets.length }
      })
    }

    // ✅ BATCH обработка: параллельные запросы с контролем concurrency
    const BATCH_SIZE = 3 // Консервативный размер для NFT запросов (они тяжелее counts)
    const batches: string[][] = []
    
    for (let i = 0; i < validWallets.length; i += BATCH_SIZE) {
      batches.push(validWallets.slice(i, i + BATCH_SIZE))
    }

    console.log(`[handleGetNFTsBatch] 📦 Разбито на ${batches.length} батчей по ≤${BATCH_SIZE} кошельков`)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const batchStart = Date.now()

      console.log(`[handleGetNFTsBatch] ⚡ Обработка батча ${batchIndex + 1}/${batches.length} (${batch.length} кошельков)`)

      // Параллельные запросы для текущего батча
      const batchPromises = batch.map(async (wallet) => {
        try {
          const allNFTs: any[] = []
          let page = 1
          let hasMore = true
          
          // Получаем все NFT для кошелька (до 5 страниц)
          while (hasMore && page <= 5) {
            const response = await workingRpc.dasRequest('getAssetsByOwner', {
              ownerAddress: wallet,
              page: page,
              limit: 50
            })
            
            const assets = response?.items || []
            
            for (const asset of assets) {
              const nft = {
                id: asset.id,
                mintAddress: asset.id,
                name: asset.content?.metadata?.name || 'Без названия',
                description: asset.content?.metadata?.description || 'Без описания',
                image: asset.content?.links?.image || asset.content?.metadata?.image || null,
                collection: getCollectionName(asset),
                symbol: asset.content?.metadata?.symbol || 'NFT',
                uri: asset.content?.json_uri || null,
                attributes: asset.content?.metadata?.attributes || [],
                isCompressed: asset.compression?.compressed === true,
                treeId: asset.compression?.tree || null
              }
              
              allNFTs.push(nft)
            }
            
            hasMore = assets.length === 50 && response?.total > page * 50
            page++
          }
          
          console.log(`[handleGetNFTsBatch] 📊 ${wallet.slice(0,8)}... = ${allNFTs.length} NFTs`)
          return { 
            wallet, 
            result: { 
              success: true, 
              nfts: allNFTs, 
              count: allNFTs.length,
              meta: { rpcUsed, supportsDAS: true, walletAddress: wallet }
            }
          }
        } catch (error) {
          console.warn(`[handleGetNFTsBatch] ⚠️ Ошибка для ${wallet.slice(0,8)}...:`, error)
          return { 
            wallet, 
            result: { 
              success: false, 
              nfts: [], 
              count: 0, 
              error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            }
          }
        }
      })

      // Выполняем параллельные запросы с timeout
      const batchResults = await Promise.allSettled(
        batchPromises.map(p => Promise.race([
          p,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 12000))
        ]))
      )

      // Обрабатываем результаты батча
      batchResults.forEach((result, index) => {
        const wallet = batch[index]
        if (result.status === 'fulfilled') {
          const { result: nftResult } = result.value as { wallet: string, result: any }
          results[wallet] = nftResult
        } else {
          console.warn(`[handleGetNFTsBatch] ⚠️ Неудачный запрос для ${wallet.slice(0,8)}...`)
          results[wallet] = { success: false, nfts: [], count: 0, error: 'Timeout или сетевая ошибка' }
        }
      })

      const batchTime = Date.now() - batchStart
      console.log(`[handleGetNFTsBatch] ✅ Батч ${batchIndex + 1}/${batches.length} обработан за ${batchTime}ms`)

      // Пауза между батчами для снижения нагрузки на RPC
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const totalTime = Date.now() - startTime
    const successCount = Object.values(results).filter((r: any) => r.success).length
    console.log(`[handleGetNFTsBatch] 🎉 ЗАВЕРШЕНО: ${successCount}/${Object.keys(results).length} NFT коллекций за ${totalTime}ms`)

    // ✅ КЭШИРУЕМ РЕЗУЛЬТАТЫ для будущих запросов
    try {
      // Кэшируем только новые результаты (не кэшированные ранее)
      const newResults: Record<string, any> = {}
      for (const wallet of validWallets) {
        if (results[wallet]) {
          newResults[wallet] = results[wallet]
        }
      }
      
      if (Object.keys(newResults).length > 0) {
        cacheBatchNFTResults(validWallets, newResults)
      }
    } catch (cacheError) {
      console.warn(`[handleGetNFTsBatch] ⚠️ Ошибка кэширования результатов:`, cacheError)
      // Не критично - продолжаем работу без кэширования
    }

    return NextResponse.json({
      success: true,
      results,
      timing: { 
        total: totalTime, 
        walletsCount: validWallets.length,
        successCount,
        averagePerWallet: validWallets.length > 0 ? Math.round(totalTime / validWallets.length * 100) / 100 : 0,
        cacheHits: Object.keys(cached).length
      },
      meta: {
        rpcUsed,
        supportsDAS: true
      }
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`[handleGetNFTsBatch] ❌ Критическая ошибка за ${totalTime}ms:`, error)
    
    return NextResponse.json({
      success: false,
      error: 'Не удалось получить NFT коллекции',
      results: {},
      timing: { total: totalTime, walletsCount: 0 }
    }, { status: 500 })
  }
} 