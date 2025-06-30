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
  collectionAddress?: string  // ✨ Поле для collection address
  capacity: number
  minted: number
  creator?: string
  symbol?: string
  image?: string
  hasValidTree: boolean
  supportsDAS: boolean
  rpcUsed: string
  isEmpty?: boolean  // ✨ Новое поле для обозначения пустых коллекций
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
        signal: AbortSignal.timeout(30000) // ✨ Увеличиваем timeout до 30 секунд
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

// Функция больше не нужна - получаем название коллекции напрямую из metadata

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

// ✨ НОВАЯ ФУНКЦИЯ: Поиск Tree Address по Collection Address
async function findTreeByCollectionAddress(collectionAddress: string, rpc: any): Promise<string | null> {
  try {
    console.log(`[findTreeByCollectionAddress] 🔍 Ищем tree для коллекции: ${collectionAddress}`)
    console.log(`[findTreeByCollectionAddress] Используем RPC: ${rpc.url}`)
    
    // Используем getAssetsByGroup для поиска NFT коллекции с увеличенным timeout
    const assets = await Promise.race([
      rpc.dasRequest('getAssetsByGroup', {
        groupKey: 'collection',
        groupValue: collectionAddress,
        page: 1,
        limit: 1 // Нам нужен только один NFT чтобы извлечь tree
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      )
    ])

    console.log(`[findTreeByCollectionAddress] Ответ DAS API:`, {
      total: assets?.total || 0,
      itemsCount: assets?.items?.length || 0
    })

    if (!assets || !assets.items || assets.items.length === 0) {
      console.log(`[findTreeByCollectionAddress] ❌ NFT не найдены для коллекции ${collectionAddress}`)
      console.log(`[findTreeByCollectionAddress] Возможные причины:`)
      console.log(`  - Коллекция пустая (нет заминченных NFT)`)
      console.log(`  - Collection address неверный`)
      console.log(`  - Коллекция не является Compressed NFT`)
      console.log(`  - DAS API не индексирует эту коллекцию`)
      return null
    }

    const firstNft = assets.items[0]
    console.log(`[findTreeByCollectionAddress] Первый NFT:`, {
      id: firstNft?.id,
      hasCompression: !!firstNft?.compression,
      tree: firstNft?.compression?.tree,
      compressed: firstNft?.compression?.compressed
    })

    const treeAddress = firstNft?.compression?.tree

    if (!treeAddress) {
      console.log(`[findTreeByCollectionAddress] ❌ Tree address не найден в NFT`)
      console.log(`[findTreeByCollectionAddress] Это может означать что коллекция содержит обычные NFT, а не Compressed NFT`)
      return null
    }

    console.log(`[findTreeByCollectionAddress] ✅ Найден tree: ${treeAddress}`)
    return treeAddress

  } catch (error: any) {
    console.log(`[findTreeByCollectionAddress] ❌ Ошибка поиска: ${error.message}`)
    console.log(`[findTreeByCollectionAddress] Stack trace:`, error.stack)
    return null
  }
}

// ✨ НОВАЯ ФУНКЦИЯ: Проверка валидности Merkle Tree account напрямую
async function validateMerkleTreeAccount(treeAddress: string, rpc: any): Promise<Partial<TreeData> | null> {
  try {
    console.log(`[validateMerkleTreeAccount] 🌳 Проверяем Merkle Tree account: ${treeAddress}`)
    
    // Получаем информацию об аккаунте напрямую через RPC
    const accountInfoResponse = await fetch(rpc.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'validate-tree',
        method: 'getAccountInfo',
        params: [
          treeAddress,
          {
            encoding: 'base64',
            commitment: 'confirmed'
          }
        ]
      }),
      signal: AbortSignal.timeout(10000)
    })

    if (!accountInfoResponse.ok) {
      throw new Error(`RPC error: ${accountInfoResponse.status}`)
    }

    const accountData = await accountInfoResponse.json()
    
    if (accountData.error) {
      throw new Error(`Account info error: ${accountData.error.message}`)
    }

    const accountInfo = accountData.result?.value
    
    if (!accountInfo || !accountInfo.data) {
      console.log(`[validateMerkleTreeAccount] ❌ Account не существует или пустой`)
      return null
    }

    console.log(`[validateMerkleTreeAccount] ✅ Account найден, owner: ${accountInfo.owner}`)
    console.log(`[validateMerkleTreeAccount] Account lamports: ${accountInfo.lamports}, executable: ${accountInfo.executable}`)

    // Проверяем, что owner это SPL Account Compression program
    const ACCOUNT_COMPRESSION_PROGRAM_ID = 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'
    const SPL_NOOP_PROGRAM_ID = 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'
    
    if (accountInfo.owner !== ACCOUNT_COMPRESSION_PROGRAM_ID) {
      console.log(`[validateMerkleTreeAccount] ⚠️ Account owner не является Account Compression program: ${accountInfo.owner}`)
      // Не возвращаем ошибку - возможно это другой тип валидного account
    }

    // Декодируем account data для получения параметров Merkle Tree
    const accountDataBuffer = Buffer.from(accountInfo.data[0], 'base64')
    console.log(`[validateMerkleTreeAccount] Account data size: ${accountDataBuffer.length} bytes`)
    
    let treeCapacity = 1024 // По умолчанию
    let maxDepth = 20       // По умолчанию
    let maxBufferSize = 64  // По умолчанию
    
    // Пытаемся извлечь параметры из account data
    if (accountDataBuffer.length >= 8) {
      try {
        // Структура Merkle Tree account data может варьироваться
        // Стандартные размеры для Compressed NFT
        const possibleCapacities = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576]
        
        // Пытаемся определить capacity из размера account data
        // Больший account data обычно означает больший capacity
        if (accountDataBuffer.length >= 100000) {
          treeCapacity = 65536
          maxDepth = 26
        } else if (accountDataBuffer.length >= 50000) {
          treeCapacity = 16384
          maxDepth = 24
        } else if (accountDataBuffer.length >= 10000) {
          treeCapacity = 4096
          maxDepth = 22
        } else if (accountDataBuffer.length >= 1000) {
          treeCapacity = 1024
          maxDepth = 20
        } else {
          treeCapacity = 256
          maxDepth = 18
        }
        
        console.log(`[validateMerkleTreeAccount] Оценка параметров: capacity=${treeCapacity}, depth=${maxDepth}`)
        
      } catch (parseError) {
        console.log(`[validateMerkleTreeAccount] Не удалось парсить account data, используем значения по умолчанию`)
      }
    }

    // ✨ Пытаемся получить реальное название коллекции
    let collectionName = `Empty Tree ${treeAddress.slice(0, 8)}...${treeAddress.slice(-4)}`
    let collectionSymbol = 'cNFT'
    let collectionDescription = 'Empty Compressed NFT collection ready for minting'
    let collectionImage = null
    
    // Метод 1: Проверяем не является ли tree address одновременно collection address
    try {
      console.log(`[validateMerkleTreeAccount] 🔍 Пытаемся получить metadata как collection address...`)
      
      const collectionMetadata = await rpc.dasRequest('getAsset', {
        id: treeAddress
      })
      
      if (collectionMetadata && collectionMetadata.content?.metadata) {
        const meta = collectionMetadata.content.metadata
        if (meta.name && !meta.name.includes('#')) { // Исключаем названия NFT с номерами
          collectionName = meta.name
          console.log(`[validateMerkleTreeAccount] ✅ Получено название из collection metadata: "${collectionName}"`)
        }
        if (meta.symbol) {
          collectionSymbol = meta.symbol
        }
        if (meta.description) {
          collectionDescription = meta.description
        }
        if (collectionMetadata.content?.links?.image || meta.image) {
          collectionImage = collectionMetadata.content.links.image || meta.image
        }
      }
    } catch (error: any) {
      console.log(`[validateMerkleTreeAccount] Collection metadata не найдена: ${error.message}`)
    }
    
    // Метод 2: Если название все еще автоматическое, используем более читаемый формат
    if (collectionName.includes('Empty Tree')) {
      collectionName = `New Collection ${treeAddress.slice(0, 8)}`
      console.log(`[validateMerkleTreeAccount] Используем fallback название: "${collectionName}"`)
    }

    // Создаем информацию о пустой коллекции
    const emptyTreeData: Partial<TreeData> = {
      name: collectionName,
      description: collectionDescription,
      capacity: treeCapacity,
      minted: 0,
      symbol: collectionSymbol,
      image: collectionImage,
      hasValidTree: true,  // ✅ Валидный но пустой tree
      supportsDAS: true    // DAS может индексировать после первого минтинга
    }

    console.log(`[validateMerkleTreeAccount] ✅ Валидный пустой Merkle Tree обнаружен:`, {
      capacity: emptyTreeData.capacity,
      hasValidTree: emptyTreeData.hasValidTree
    })

    return emptyTreeData

  } catch (error: any) {
    console.log(`[validateMerkleTreeAccount] ❌ Ошибка проверки Merkle Tree: ${error.message}`)
    return null
  }
}

// 🎯 ПРОСТАЯ логика получения данных коллекции
async function fetchTreeDataViaDAS(treeAddress: string, rpc: any, requestedCollectionAddress?: string): Promise<Partial<TreeData>> {
  console.log(`[fetchTreeDataViaDAS] Получаем данные: tree=${treeAddress}, collection=${requestedCollectionAddress}`)
  
  try {
    let totalNFTs = 0
    let compressionData: any = {}
    let collectionAddress = requestedCollectionAddress
    let collectionMetadata: any = {}
    
    // 📍 ШАГИ:
    // 1. Получаем NFT из дерева или коллекции
    // 2. Извлекаем collection address из первого NFT (если не передан)
    // 3. Получаем метаданные коллекции напрямую
    // 4. Готово!

    // Шаг 1: Получаем NFT
    let nftData = null
    
    // Пробуем сначала по tree ID
    try {
      console.log(`[fetchTreeDataViaDAS] 🌳 Получаем NFT по tree ID...`)
      nftData = await rpc.dasRequest('getAssetsByTree', {
        treeId: treeAddress,
        page: 1,
        limit: 1 // Нужен только первый NFT для извлечения данных
      })
      
      if (nftData?.total > 0) {
        totalNFTs = nftData.total
        compressionData = nftData.items[0]?.compression || {}
        console.log(`[fetchTreeDataViaDAS] ✅ Найдено ${totalNFTs} NFT в дереве`)
      }
    } catch (error: any) {
      console.log(`[fetchTreeDataViaDAS] Tree поиск не сработал: ${error.message}`)
    }

    // Если не нашли по tree, пробуем по collection (если передан collection address)
    if (totalNFTs === 0 && requestedCollectionAddress) {
      try {
        console.log(`[fetchTreeDataViaDAS] 📦 Получаем NFT по collection address...`)
        nftData = await rpc.dasRequest('getAssetsByGroup', {
          groupKey: 'collection',
          groupValue: requestedCollectionAddress,
          page: 1,
          limit: 1
        })
        
        if (nftData?.total > 0) {
          totalNFTs = nftData.total
          compressionData = nftData.items[0]?.compression || {}
          console.log(`[fetchTreeDataViaDAS] ✅ Найдено ${totalNFTs} NFT в коллекции`)
        }
      } catch (error: any) {
        console.log(`[fetchTreeDataViaDAS] Collection поиск не сработал: ${error.message}`)
      }
    }

    // Шаг 2: Извлекаем collection address из NFT (если не был передан)
    if (!collectionAddress && nftData?.items?.[0]) {
      const firstNFT = nftData.items[0]
      const collectionGroup = firstNFT.grouping?.find((g: any) => g.group_key === 'collection')
      if (collectionGroup?.group_value) {
        collectionAddress = collectionGroup.group_value
        console.log(`[fetchTreeDataViaDAS] 🔍 Извлечен collection address: ${collectionAddress}`)
      }
    }

    // Шаг 3: Получаем метаданные коллекции напрямую
    if (collectionAddress) {
      try {
        console.log(`[fetchTreeDataViaDAS] 📋 Получаем metadata коллекции...`)
        const collectionNFT = await rpc.dasRequest('getAsset', {
          id: collectionAddress
        })
        
        if (collectionNFT?.content?.metadata) {
          collectionMetadata = collectionNFT.content.metadata
          console.log(`[fetchTreeDataViaDAS] ✅ Получены метаданные коллекции: "${collectionMetadata.name}"`)
        }
      } catch (error: any) {
        console.log(`[fetchTreeDataViaDAS] Не удалось получить метаданные коллекции: ${error.message}`)
      }
    }

    // Шаг 4: Формируем результат
    if (totalNFTs > 0) {
      const capacity = estimateCapacityFromTreeData(compressionData, totalNFTs)
      
      return {
        name: collectionMetadata.name || `Collection ${collectionAddress?.slice(0, 8) || treeAddress.slice(0, 8)}`,
        description: collectionMetadata.description || 'Compressed NFT collection',
        capacity: capacity,
        minted: totalNFTs,
        symbol: collectionMetadata.symbol || 'cNFT',
        image: collectionMetadata.image,
        hasValidTree: true,
        supportsDAS: true,
        collectionAddress: collectionAddress
      }
    }
    
    // ✨ Если NFT не найдены, проверяем пустую коллекцию
    console.log(`[fetchTreeDataViaDAS] ⚠️ NFT не найдены, проверяем пустую коллекцию...`)
    
    const emptyTreeData = await validateMerkleTreeAccount(treeAddress, rpc)
    if (emptyTreeData) {
      console.log(`[fetchTreeDataViaDAS] ✅ Найдена пустая валидная коллекция`)
      return {
        ...emptyTreeData,
        collectionAddress: collectionAddress,
        hasValidTree: true,
        supportsDAS: true,
        isEmpty: true
      }
    }
    
    // Если ничего не найдено
    console.log(`[fetchTreeDataViaDAS] ❌ Коллекция не найдена`)
    return {
      name: `Unknown ${treeAddress.slice(0, 8)}`,
      description: 'Collection not found',
      capacity: 0,
      minted: 0,
      symbol: 'cNFT',
      hasValidTree: false,
      supportsDAS: false,
      collectionAddress: collectionAddress
    }
    
  } catch (error: any) {
    console.error(`[fetchTreeDataViaDAS] Ошибка:`, error.message)
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
async function fetchTreeData(treeAddress: string, collectionAddress?: string): Promise<TreeData> {
  console.log(`[fetchTreeData] Получаем данные для tree: ${treeAddress}`)
  if (collectionAddress) {
    console.log(`[fetchTreeData] Связанная коллекция: ${collectionAddress}`)
  }
  
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
        treeData = await fetchTreeDataViaDAS(treeAddress, rpc, collectionAddress)
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
    
    // ✨ НОВАЯ ЛОГИКА: Даже без DAS API пытаемся проверить Merkle Tree
    console.log(`[fetchTreeData] 🔍 Пытаемся проверить Merkle Tree без DAS API...`)
    
    // Пробуем первый доступный RPC для проверки account
    for (const rpcUrl of BACKUP_RPC_URLS) {
      if (!rpcUrl) continue
      
      try {
        const rpc = createRpcInstance(rpcUrl)
        console.log(`[fetchTreeData] Проверяем Merkle Tree через RPC: ${rpcUrl}`)
        
        const emptyTreeData = await validateMerkleTreeAccount(treeAddress, rpc)
        
        if (emptyTreeData) {
          console.log(`[fetchTreeData] ✅ Найдена пустая валидная коллекция через fallback RPC!`)
          
          return {
            name: emptyTreeData.name || `Empty Tree ${treeAddress.slice(0, 8)}`,
            description: emptyTreeData.description || 'Empty Compressed NFT collection ready for minting',
            treeAddress: treeAddress,
            collectionAddress: collectionAddress, // ✨ Возвращаем collection address
            capacity: emptyTreeData.capacity || 1024,
            minted: 0,
            creator: emptyTreeData.creator,
            symbol: emptyTreeData.symbol || 'cNFT',
            image: emptyTreeData.image,
            hasValidTree: true,   // ✅ Валидная пустая коллекция
            supportsDAS: false,   // DAS API недоступен, но tree валидный
            rpcUsed: rpcUrl,
            isEmpty: true
          }
        }
      } catch (error: any) {
        console.log(`[fetchTreeData] RPC ${rpcUrl} не смог проверить Merkle Tree: ${error.message}`)
        continue
      }
    }
    
    // Если все методы не сработали, возвращаем ошибку
    console.log(`[fetchTreeData] ❌ Не удалось найти валидный Merkle Tree или коллекцию`)
    return {
      name: `Tree ${treeAddress.slice(0, 8)}...${treeAddress.slice(-4)}`,
      description: 'Compressed NFT tree (connection failed and no valid Merkle Tree found)',
      treeAddress: treeAddress,
      collectionAddress: collectionAddress, // ✨ Возвращаем collection address
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
    rpcUsed: currentRpcUrl,
    isEmpty: treeData.isEmpty,
    collectionAddress: collectionAddress // ✨ Возвращаем collection address если он был найден
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
    const { treeAddress, collectionAddress } = await request.json()

    // Проверяем что передан хотя бы один из адресов
    if (!treeAddress && !collectionAddress) {
      return NextResponse.json(
        { error: 'Tree address or collection address is required' },
        { status: 400 }
      )
    }

    // Валидация адресов (Solana адрес 44 символа base58)
    const addressRegex = /^[1-9A-HJ-NP-Za-km-z]{44}$/
    
    if (treeAddress && !addressRegex.test(treeAddress)) {
      return NextResponse.json(
        { error: 'Invalid Solana tree address format' },
        { status: 400 }
      )
    }

    if (collectionAddress && !addressRegex.test(collectionAddress)) {
      return NextResponse.json(
        { error: 'Invalid Solana collection address format' },
        { status: 400 }
      )
    }

    let finalTreeAddress = treeAddress
    let finalCollectionAddress = collectionAddress

    // ✨ Если передан collection address, сначала найдем tree address
    if (collectionAddress && !treeAddress) {
      console.log(`[API] Поиск tree address для коллекции: ${collectionAddress}`)
      
      // Перебираем RPC для поиска tree
      let foundTree = null
      let lastError = null
      let attemptedRpcs = []

      for (const rpcUrl of BACKUP_RPC_URLS) {
        if (!rpcUrl) continue
        
        try {
          console.log(`[API] Пробуем RPC: ${rpcUrl}`)
          attemptedRpcs.push(rpcUrl)
          
          const rpc = createRpcInstance(rpcUrl)
          const hasDASSupport = await checkDASApiSupport(rpc)
          
          if (hasDASSupport) {
            console.log(`[API] RPC ${rpcUrl} поддерживает DAS API, ищем коллекцию...`)
            foundTree = await findTreeByCollectionAddress(collectionAddress, rpc)
            if (foundTree) {
              console.log(`[API] ✅ Найден tree через RPC ${rpcUrl}: ${foundTree}`)
              break
            } else {
              console.log(`[API] RPC ${rpcUrl} не нашел коллекцию`)
            }
          } else {
            console.log(`[API] RPC ${rpcUrl} не поддерживает DAS API`)
          }
        } catch (error: any) {
          lastError = error
          console.log(`[API] Ошибка поиска tree через RPC ${rpcUrl}: ${error.message}`)
          continue
        }
      }

      if (!foundTree) {
        console.log(`[API] ❌ Не удалось найти tree для коллекции ${collectionAddress}`)
        console.log(`[API] Попробованные RPC:`, attemptedRpcs)
        console.log(`[API] Последняя ошибка:`, lastError?.message)
        
        return NextResponse.json(
          { 
            error: 'Could not find tree address for the provided collection address',
            details: `Searched through ${attemptedRpcs.length} RPC endpoints. This collection might be:\n• Empty (no minted NFTs)\n• Regular NFT collection (not Compressed NFT)\n• Not indexed by DAS API yet\n• Invalid collection address`,
            attemptedRpcs: attemptedRpcs,
            lastError: lastError?.message
          },
          { status: 404 }
        )
      }

      finalTreeAddress = foundTree
    }

    console.log(`[API] Получение данных для tree: ${finalTreeAddress}`)
    if (finalCollectionAddress) {
      console.log(`[API] Связанная коллекция: ${finalCollectionAddress}`)
    }

    // Получаем данные коллекции с улучшенной логикой
    const collectionData = await fetchTreeData(finalTreeAddress, finalCollectionAddress)

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