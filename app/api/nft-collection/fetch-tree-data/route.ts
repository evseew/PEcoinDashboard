import { NextRequest, NextResponse } from 'next/server'
import { getAlchemyUrl } from '@/lib/alchemy/solana'

const ALCHEMY_URL = getAlchemyUrl()

interface TreeData {
  name: string
  description: string
  treeAddress: string
  capacity: number
  minted: number
  creator?: string
  symbol?: string
  image?: string
}

async function fetchTreeData(treeAddress: string): Promise<TreeData> {
  try {
    console.log(`[fetchTreeData] Получаем данные для tree: ${treeAddress}`)
    
    // Пробуем получить информацию о коллекции через DAS API
    const dasRequest = {
      jsonrpc: '2.0',
      id: 'get-assets-by-tree',
      method: 'getAssetsByGroup',
      params: {
        groupKey: 'collection',
        groupValue: treeAddress,
        page: 1,
        limit: 10,
        displayOptions: {
          showFungible: false,
          showUnverifiedCollections: true
        }
      }
    }

    console.log(`[fetchTreeData] Отправляем DAS запрос...`)
    
    const response = await fetch(ALCHEMY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dasRequest),
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      throw new Error(`DAS API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`DAS API error: ${data.error.message}`)
    }

    const assets = data.result?.items || []
    const totalAssets = data.result?.total || 0

    // Если найдены assets, извлекаем информацию из первого
    if (assets.length > 0) {
      const firstAsset = assets[0]
      const metadata = firstAsset.content?.metadata
      const grouping = firstAsset.grouping?.find((g: any) => g.group_key === 'collection')
      
      return {
        name: metadata?.name || grouping?.group_value || `Collection ${treeAddress.slice(0, 8)}`,
        description: metadata?.description || 'Compressed NFT collection',
        treeAddress: treeAddress,
        capacity: estimateCapacityFromCount(totalAssets),
        minted: totalAssets,
        creator: firstAsset.creators?.[0]?.address,
        symbol: metadata?.symbol || 'CNFT',
        image: firstAsset.content?.links?.image || metadata?.image
      }
    }

    // Если ничего не найдено, пробуем другой подход - получить assets по tree ID
    const treeAssetsRequest = {
      jsonrpc: '2.0',
      id: 'get-assets-by-tree',
      method: 'getAssetsByTree',
      params: {
        treeId: treeAddress,
        page: 1,
        limit: 10
      }
    }

    const treeResponse = await fetch(ALCHEMY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(treeAssetsRequest),
      signal: AbortSignal.timeout(15000)
    })

    if (treeResponse.ok) {
      const treeData = await treeResponse.json()
      const treeAssets = treeData.result?.items || []
      const treeTotalAssets = treeData.result?.total || 0

      if (treeAssets.length > 0) {
        const firstAsset = treeAssets[0]
        const metadata = firstAsset.content?.metadata
        
        return {
          name: metadata?.name || `Tree Collection ${treeAddress.slice(0, 8)}`,
          description: metadata?.description || 'Compressed NFT tree collection',
          treeAddress: treeAddress,
          capacity: estimateCapacityFromCount(treeTotalAssets),
          minted: treeTotalAssets,
          creator: firstAsset.creators?.[0]?.address,
          symbol: metadata?.symbol || 'CNFT',
          image: firstAsset.content?.links?.image || metadata?.image
        }
      }
    }

    // Если ничего не удалось получить, возвращаем базовые данные
    return {
      name: `Collection ${treeAddress.slice(0, 8)}...${treeAddress.slice(-4)}`,
      description: 'Compressed NFT collection imported automatically',
      treeAddress: treeAddress,
      capacity: 1024, // Стандартное значение
      minted: 0,
      symbol: 'CNFT'
    }

  } catch (error) {
    console.error(`[fetchTreeData] Ошибка:`, error)
    
    // Возвращаем базовые данные при ошибке
    return {
      name: `Collection ${treeAddress.slice(0, 8)}...${treeAddress.slice(-4)}`,
      description: 'Compressed NFT collection imported automatically',
      treeAddress: treeAddress,
      capacity: 1024,
      minted: 0,
      symbol: 'CNFT'
    }
  }
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

export async function POST(request: NextRequest) {
  try {
    const { treeAddress } = await request.json()

    if (!treeAddress) {
      return NextResponse.json(
        { error: 'Tree address is required' },
        { status: 400 }
      )
    }

    // Валидация tree address
    if (!/^[1-9A-HJ-NP-Za-km-z]{44}$/.test(treeAddress)) {
      return NextResponse.json(
        { error: 'Invalid Solana tree address format' },
        { status: 400 }
      )
    }

    console.log(`[API] Получение данных для tree: ${treeAddress}`)

    // Получаем данные коллекции
    const collectionData = await fetchTreeData(treeAddress)

    return NextResponse.json({
      success: true,
      collection: collectionData
    })

  } catch (error) {
    console.error('[API] Error fetching tree data:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch collection data',
        details: 'Could not retrieve collection information from the provided tree address'
      },
      { status: 500 }
    )
  }
} 