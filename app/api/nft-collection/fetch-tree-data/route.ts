import { NextRequest, NextResponse } from 'next/server'

// Конфигурация RPC эндпоинтов на основе проверенного кода
const USER_RPC_URL = process.env.RPC_URL || process.env.ALCHEMY_URL
const MAIN_RPC_URL = "https://api.mainnet-beta.solana.com"
const BACKUP_RPC_URLS = [
  USER_RPC_URL, // Пользовательский RPC первым (обычно поддерживает DAS API)
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
  MAIN_RPC_URL
].filter(url => url && url.trim() !== "") // Удаляем пустые URL

interface TreeData {
  name: string
  description: string
  treeAddress: string
  capacity: number
  minted: number
  creator?: string
  symbol?: string
  image?: string
  hasValidTree: boolean
  supportsDAS: boolean
  rpcUsed: string
}

// Создание экземпляра для работы с RPC (адаптировано из вашего кода)
function createRpcInstance(url: string) {
  console.log(`[fetchTreeData] Создаем RPC инстанс для: ${url}`)
  return {
    url,
    // Метод для DAS API запросов
    async dasRequest(method: string, params: any) {
      const dasRequest = {
        jsonrpc: '2.0',
        id: 'fetch-tree-data',
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

// Функция для поиска общего префикса в названиях NFT
function findCommonPrefix(names: string[]): string {
  if (!names || names.length === 0) return ''
  if (names.length === 1) return names[0]
  
  let prefix = names[0]
  for (let i = 1; i < names.length; i++) {
    let j = 0
    while (j < prefix.length && j < names[i].length && prefix[j] === names[i][j]) {
      j++
    }
    prefix = prefix.substring(0, j)
    if (prefix === '') break
  }
  
  return prefix
}

// Проверка поддержки DAS API (из вашего get_nfts.js)
async function checkDASApiSupport(rpc: any): Promise<boolean> {
  try {
    console.log(`[checkDASApiSupport] Проверяем поддержку DAS API...`)
    
    // Тестовый запрос с минимальными данными
    await rpc.dasRequest('getAssetsByOwner', {
      ownerAddress: "11111111111111111111111111111112", // System program как тестовый адрес
      limit: 1
    })
    
    console.log(`[checkDASApiSupport] ✅ DAS API поддерживается`)
    return true
  } catch (error: any) {
    console.log(`[checkDASApiSupport] ❌ DAS API не поддерживается: ${error.message}`)
    return false
  }
}

// Получение данных через DAS API (исправлено для CNFT коллекций)
async function fetchTreeDataViaDAS(treeAddress: string, rpc: any): Promise<Partial<TreeData>> {
  console.log(`[fetchTreeDataViaDAS] Получаем данные для CNFT: ${treeAddress}`)
  
  try {
    let treeTotalAssets = 0
    let treeItems: any[] = []
    let collectionMetadata: any = {}
    let compressionData: any = {}
    
    // Метод 1: Сначала пробуем получить по tree ID (для Merkle Tree адресов)
    try {
      console.log(`[fetchTreeDataViaDAS] Пробуем getAssetsByTree для tree ID...`)
      const treeAssets = await rpc.dasRequest('getAssetsByTree', {
        treeId: treeAddress,
        page: 1,
        limit: 50 // Увеличим лимит для лучшего анализа
      })
      
      treeTotalAssets = treeAssets?.total || 0
      treeItems = treeAssets?.items || []
      
      console.log(`[fetchTreeDataViaDAS] По tree ID найдено ${treeTotalAssets} ассетов`)
      
      if (treeItems.length > 0) {
        const firstAsset = treeItems[0]
        collectionMetadata = firstAsset.content?.metadata || {}
        compressionData = firstAsset.compression || {}
        
        // Проверяем что это действительно compressed NFT
        if (compressionData.compressed === true && compressionData.tree) {
          console.log(`[fetchTreeDataViaDAS] ✅ Подтверждено: это Compressed NFT tree`)
        }
      }
          } catch (error: any) {
        console.log(`[fetchTreeDataViaDAS] Tree ID поиск не дал результатов: ${error.message}`)
      }
    
    // Метод 2: Если tree поиск не дал результатов, пробуем как collection address
    if (treeTotalAssets === 0) {
      try {
        console.log(`[fetchTreeDataViaDAS] Пробуем getAssetsByGroup как collection...`)
        const collectionAssets = await rpc.dasRequest('getAssetsByGroup', {
          groupKey: 'collection',
          groupValue: treeAddress,
          page: 1,
          limit: 50
        })
        
        treeTotalAssets = collectionAssets?.total || 0
        treeItems = collectionAssets?.items || []
        
        console.log(`[fetchTreeDataViaDAS] По collection найдено ${treeTotalAssets} ассетов`)
        
        if (treeItems.length > 0) {
          const firstAsset = treeItems[0]
          collectionMetadata = firstAsset.content?.metadata || {}
          compressionData = firstAsset.compression || {}
        }
              } catch (error: any) {
          console.log(`[fetchTreeDataViaDAS] Collection поиск не дал результатов: ${error.message}`)
        }
    }
    
    // Метод 3: Дополнительная проверка через getAsset (если это asset ID)
    if (treeTotalAssets === 0) {
      try {
        console.log(`[fetchTreeDataViaDAS] Пробуем getAsset как единичный asset...`)
        const singleAsset = await rpc.dasRequest('getAsset', {
          id: treeAddress
        })
        
        if (singleAsset && singleAsset.compression?.compressed === true) {
          console.log(`[fetchTreeDataViaDAS] Найден единичный compressed NFT`)
          
          // Если это единичный asset, находим его коллекцию
          const assetCollection = singleAsset.grouping?.find((g: any) => g.group_key === 'collection')
          if (assetCollection) {
            // Получаем все NFT этой коллекции
            const collectionAssets = await rpc.dasRequest('getAssetsByGroup', {
              groupKey: 'collection',
              groupValue: assetCollection.group_value,
              page: 1,
              limit: 50
            })
            
            treeTotalAssets = collectionAssets?.total || 1
            treeItems = collectionAssets?.items || [singleAsset]
            collectionMetadata = singleAsset.content?.metadata || {}
            compressionData = singleAsset.compression || {}
            
            console.log(`[fetchTreeDataViaDAS] Через единичный asset найдено ${treeTotalAssets} в коллекции`)
          } else {
            // Если коллекция не найдена, считаем этот asset единичным
            treeTotalAssets = 1
            treeItems = [singleAsset]
            collectionMetadata = singleAsset.content?.metadata || {}
            compressionData = singleAsset.compression || {}
          }
        }
              } catch (error: any) {
          console.log(`[fetchTreeDataViaDAS] Single asset поиск не дал результатов: ${error.message}`)
        }
    }
    
    // Анализируем полученные данные
    if (treeTotalAssets > 0 && treeItems.length > 0) {
      console.log(`[fetchTreeDataViaDAS] ✅ Успешно найдено ${treeTotalAssets} compressed NFT`)
      
      // Получаем реальные параметры дерева
      const realCapacity = estimateCapacityFromTreeData(compressionData, treeTotalAssets)
      
      // Пытаемся найти лучшее изображение для коллекции
      let bestImage = ''
      for (const asset of treeItems.slice(0, 5)) { // Проверяем первые 5 NFT
        const assetImage = asset.content?.links?.image || asset.content?.metadata?.image
        if (assetImage && assetImage.includes('http')) {
          bestImage = assetImage
          break
        }
      }
      
      // Определяем создателя (первый в списке creators)
      const creator = treeItems[0]?.creators?.[0]?.address || 
                     treeItems[0]?.authorities?.[0]?.address

      // Улучшенная логика получения названия коллекции
      let collectionName = `Compressed Collection ${treeAddress.slice(0, 8)}`
      
      // 1. Ищем collection grouping в первом NFT
      const firstAsset = treeItems[0]
      if (firstAsset?.grouping) {
        const collectionGroup = firstAsset.grouping.find((g: any) => g.group_key === 'collection')
        if (collectionGroup?.group_value) {
          // Если есть collection address, пробуем получить его metadata
          try {
            const collectionAssets = treeItems.filter((asset: any) => 
              asset.grouping?.some((g: any) => 
                g.group_key === 'collection' && g.group_value === collectionGroup.group_value
              )
            )
            
                          // Анализируем названия NFT для определения паттерна коллекции
              if (collectionAssets.length > 1) {
                const nftNames = collectionAssets.slice(0, 10).map((asset: any) => 
                  asset.content?.metadata?.name || ''
                ).filter(name => name)
                
                console.log(`[fetchTreeDataViaDAS] Анализируем названия NFT:`, nftNames)
                
                // Находим общую часть в названиях
                const commonPrefix = findCommonPrefix(nftNames)
                console.log(`[fetchTreeDataViaDAS] Общий префикс: "${commonPrefix}"`)
                
                if (commonPrefix && commonPrefix.length > 3) {
                  collectionName = commonPrefix.trim()
                  // Убираем числа и символы в конце
                  collectionName = collectionName.replace(/\s*#?\d*\s*$/, '').trim()
                  console.log(`[fetchTreeDataViaDAS] Название коллекции из префикса: "${collectionName}"`)
                }
              }
          } catch (e) {
            console.log('[fetchTreeDataViaDAS] Не удалось определить название коллекции из группировки')
          }
        }
      }
      
              // 2. Fallback: используем metadata name только если он не содержит номер NFT
        if (collectionName.includes('Collection') && collectionMetadata.name) {
          const metaName = collectionMetadata.name
          console.log(`[fetchTreeDataViaDAS] Проверяем metadata name: "${metaName}"`)
          // Проверяем что это не название отдельного NFT (не содержит #число в конце)
          if (!/\s*#\s*\d+\s*$/.test(metaName)) {
            collectionName = metaName
            console.log(`[fetchTreeDataViaDAS] Используем metadata name: "${collectionName}"`)
          } else {
            console.log(`[fetchTreeDataViaDAS] Metadata name содержит номер NFT, пропускаем`)
          }
        }
        
        console.log(`[fetchTreeDataViaDAS] Финальное название коллекции: "${collectionName}"`)
        
        return {
          name: collectionName,
        description: collectionMetadata.description || 'Compressed NFT collection',
        capacity: realCapacity,
        minted: treeTotalAssets,
        creator: creator,
        symbol: collectionMetadata.symbol || 'cNFT',
        image: bestImage || collectionMetadata.image,
        hasValidTree: true,
        supportsDAS: true
      }
    }
    
    // Если ничего не найдено, возвращаем базовые данные
    console.log(`[fetchTreeDataViaDAS] ⚠️ Не найдено compressed NFT для адреса ${treeAddress}`)
    return {
      name: `Address ${treeAddress.slice(0, 8)}...${treeAddress.slice(-4)}`,
      description: 'Не удалось найти compressed NFT по этому адресу',
      capacity: 0,
      minted: 0,
      symbol: 'cNFT',
      hasValidTree: false,
      supportsDAS: true
    }
    
  } catch (error: any) {
    console.error(`[fetchTreeDataViaDAS] Критическая ошибка:`, error.message)
    throw error
  }
}

// Улучшенная эвристика capacity (на основе реальных данных дерева)
function estimateCapacityFromTreeData(compression: any, mintedCount: number): number {
  // Если есть данные о дереве, используем их
  if (compression.tree && compression.leaf_id !== undefined) {
    const leafId = compression.leaf_id
    // Capacity обычно степень двойки, больше чем самый большой leaf_id
    const standardSizes = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576]
    
    for (const size of standardSizes) {
      if (size > Math.max(leafId, mintedCount)) {
        return size
      }
    }
  }
  
  // Fallback к старой логике
  return estimateCapacityFromCount(mintedCount)
}

// Эвристика для определения capacity на основе количества заминченных NFT
function estimateCapacityFromCount(mintedCount: number): number {
  const standardSizes = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576]
  
  // Находим ближайший размер, который больше количества заминченных NFT
  for (const size of standardSizes) {
    if (size > mintedCount) {
      return size
    }
  }
  
  return 1048576 // Максимальный размер по умолчанию
}

// Основная функция получения данных дерева (адаптирована из вашего подхода с множественными RPC)
async function fetchTreeData(treeAddress: string): Promise<TreeData> {
  console.log(`[fetchTreeData] Получаем данные для tree: ${treeAddress}`)
  
  let connectedSuccessfully = false
  let currentRpcUrl = ""
  let supportsDAS = false
  let treeData: Partial<TreeData> = {}
  
  // Перебираем RPC эндпоинты как в вашем коде
  for (const rpcUrl of BACKUP_RPC_URLS) {
    if (!rpcUrl) continue
    
    currentRpcUrl = rpcUrl
    console.log(`[fetchTreeData] 🔄 Пробуем RPC: ${currentRpcUrl}`)
    
    try {
      const rpc = createRpcInstance(currentRpcUrl)
      
      // Проверяем поддержку DAS API
      const hasDASSupport = await checkDASApiSupport(rpc)
      
      if (hasDASSupport) {
        console.log(`[fetchTreeData] ✅ RPC поддерживает DAS API, получаем данные...`)
        
        // Получаем данные через DAS API
        treeData = await fetchTreeDataViaDAS(treeAddress, rpc)
        supportsDAS = true
        connectedSuccessfully = true
        break
      } else {
        console.log(`[fetchTreeData] ⚠️ RPC не поддерживает DAS API, пропускаем...`)
      }
      
    } catch (error: any) {
      console.log(`[fetchTreeData] ❌ Ошибка с RPC ${currentRpcUrl}: ${error.message}`)
      continue
    }
  }
  
  if (!connectedSuccessfully) {
    console.warn(`[fetchTreeData] Не удалось подключиться к RPC с DAS API поддержкой`)
    
    // Возвращаем базовые данные при ошибке
    return {
      name: `Tree ${treeAddress.slice(0, 8)}...${treeAddress.slice(-4)}`,
      description: 'Compressed NFT tree (connection failed)',
      treeAddress: treeAddress,
      capacity: 1024,
      minted: 0,
      symbol: 'cNFT',
      hasValidTree: false,
      supportsDAS: false,
      rpcUsed: 'none'
    }
  }
  
  // Формируем финальный результат
  const result: TreeData = {
    name: treeData.name || `Tree ${treeAddress.slice(0, 8)}`,
    description: treeData.description || 'Compressed NFT collection',
    treeAddress: treeAddress,
    capacity: treeData.capacity || 1024,
    minted: treeData.minted || 0,
    creator: treeData.creator,
    symbol: treeData.symbol || 'cNFT',
    image: treeData.image,
    hasValidTree: treeData.hasValidTree || false,
    supportsDAS: supportsDAS,
    rpcUsed: currentRpcUrl
  }
  
  console.log(`[fetchTreeData] ✅ Успешно получены данные:`, {
    name: result.name,
    capacity: result.capacity,
    minted: result.minted,
    rpcUsed: result.rpcUsed
  })
  
  return result
}

export async function POST(request: NextRequest) {
  try {
    const { treeAddress } = await request.json()

    if (!treeAddress) {
      return NextResponse.json(
        { error: 'Tree address is required' },
        { status: 400 }
      )
    }

    // Валидация tree address (Solana адрес 44 символа base58)
    if (!/^[1-9A-HJ-NP-Za-km-z]{44}$/.test(treeAddress)) {
      return NextResponse.json(
        { error: 'Invalid Solana tree address format' },
        { status: 400 }
      )
    }

    console.log(`[API] Получение данных для tree: ${treeAddress}`)

    // Получаем данные коллекции с улучшенной логикой
    const collectionData = await fetchTreeData(treeAddress)

    return NextResponse.json({
      success: true,
      collection: collectionData,
      meta: {
        rpcUsed: collectionData.rpcUsed,
        supportsDAS: collectionData.supportsDAS,
        hasValidTree: collectionData.hasValidTree
      }
    })

  } catch (error: any) {
    console.error('[API] Error fetching tree data:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to fetch collection data',
        details: 'Could not retrieve collection information from the provided tree address'
      },
      { status: 500 }
    )
  }
} 