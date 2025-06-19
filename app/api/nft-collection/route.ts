import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { serverCache, ServerCache } from '@/lib/server-cache'

const ALCHEMY_URL = process.env.ALCHEMY_URL || "https://solana-mainnet.g.alchemy.com/v2/VYK2v9vubZLxKwE9-ASUeQC6b1-zaVb1"
const connection = new Connection(ALCHEMY_URL, 'confirmed')

interface NFTData {
  mintAddress: string
  name: string
  symbol: string
  uri: string
  image: string
  description: string
  collection: string
  attributes: any[]
  isCompressed?: boolean
  treeId?: string
  leafIndex?: number
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchMetadataFromUri(uri: string): Promise<any | null> {
  try {
    console.log(`[fetchMetadataFromUri] Загружаем метаданные: ${uri}`)
    const response = await fetch(uri, {
      headers: {
        'User-Agent': 'PEcoin-Dashboard/1.0',
      },
      // Добавляем таймаут
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const metadata = await response.json()
    return metadata
  } catch (error) {
    console.error(`[fetchMetadataFromUri] Ошибка:`, error)
    return null
  }
}

// Упрощенный парсер Solana Metadata
function parseMetadata(data: Buffer): { name: string; symbol: string; uri: string } {
  try {
    let offset = 1 // key
    offset += 32 // update_authority
    offset += 32 // mint
    
    // Читаем name (4 байта длина + строка)
    const nameLength = data.readUInt32LE(offset)
    offset += 4
    const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '')
    offset += nameLength
    
    // Читаем symbol
    const symbolLength = data.readUInt32LE(offset)
    offset += 4
    const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '')
    offset += symbolLength
    
    // Читаем uri
    const uriLength = data.readUInt32LE(offset)
    offset += 4
    const uri = data.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '')
    
    return { name, symbol, uri }
  } catch (error) {
    console.error('[parseMetadata] Ошибка парсинга:', error)
    return { name: '', symbol: '', uri: '' }
  }
}

async function getSolanaNFTs(ownerAddress: string): Promise<NFTData[]> {
  try {
    console.log(`[getSolanaNFTs] Поиск NFT для кошелька: ${ownerAddress}`)
    
    // Получаем все token accounts владельца
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(ownerAddress),
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    )
    
    console.log(`[getSolanaNFTs] Найдено token accounts: ${tokenAccounts.value.length}`)
    
    const nfts: NFTData[] = []
    let processedCount = 0
    const maxNFTs = 20 // Ограничиваем для производительности
    
    for (const tokenAccount of tokenAccounts.value) {
      if (processedCount >= maxNFTs) break
      
      const accountInfo = tokenAccount.account.data.parsed.info
      
      // Проверяем, что баланс = 1 и decimals = 0 (характерно для NFT)
      if (accountInfo.tokenAmount.amount === '1' && accountInfo.tokenAmount.decimals === 0) {
        const mintAddress = accountInfo.mint
        console.log(`[getSolanaNFTs] Найден потенциальный NFT: ${mintAddress}`)
        
        try {
          // Ищем Metadata account
          const metadataPDA = PublicKey.findProgramAddressSync(
            [
              Buffer.from('metadata'),
              new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
              new PublicKey(mintAddress).toBuffer()
            ],
            new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
          )
          
          const metadataAccount = await connection.getAccountInfo(metadataPDA[0])
          
          if (metadataAccount?.data) {
            // Парсим metadata
            const metadata = parseMetadata(metadataAccount.data)
            
            let externalMetadata = null
            if (metadata.uri && metadata.uri.startsWith('http')) {
              externalMetadata = await fetchMetadataFromUri(metadata.uri)
              await delay(300) // Пауза между запросами
            }
            
            const nftData: NFTData = {
              mintAddress: mintAddress,
              name: metadata.name || externalMetadata?.name || 'Без названия',
              symbol: metadata.symbol || '',
              uri: metadata.uri || '',
              image: externalMetadata?.image || '',
              description: externalMetadata?.description || '',
              collection: externalMetadata?.collection?.name || 'Неизвестная коллекция',
              attributes: externalMetadata?.attributes || [],
              // Обычные NFT всегда НЕ compressed
              isCompressed: false
            }
            
            // Добавляем только если есть осмысленные данные
            if (nftData.name !== 'Без названия' || nftData.image) {
              nfts.push(nftData)
              console.log(`[getSolanaNFTs] ✓ ${nftData.name}`)
            }
            
            processedCount++
          }
        } catch (error) {
          console.log(`[getSolanaNFTs] Не удалось получить метаданные для ${mintAddress}:`, error)
        }
      }
    }
    
    return nfts
    
  } catch (error) {
    console.error(`[getSolanaNFTs] Критическая ошибка:`, error)
    throw error
  }
}

// Функция для получения compressed NFT через DAS API
async function getCompressedNFTs(ownerAddress: string): Promise<NFTData[]> {
  try {
    console.log(`[getCompressedNFTs] Поиск compressed NFT для кошелька: ${ownerAddress}`)
    
    // Формируем DAS API запрос
    const dasRequest = {
      jsonrpc: '2.0',
      id: 'get-assets',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress,
        page: 1,
        limit: 50, // Ограничиваем количество
        displayOptions: {
          showFungible: false,
          showUnverifiedCollections: false
        }
      }
    }

    console.log(`[getCompressedNFTs] Отправляем DAS запрос...`)
    
    const response = await fetch(ALCHEMY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dasRequest),
      signal: AbortSignal.timeout(15000) // 15 секунд таймаут
    })

    if (!response.ok) {
      throw new Error(`DAS API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`DAS API error: ${data.error.message}`)
    }

    const assets = data.result?.items || []
    console.log(`[getCompressedNFTs] Получено ${assets.length} ассетов через DAS API`)

    const compressedNFTs: NFTData[] = []
    let processedCount = 0
    let compressedCount = 0

    for (const asset of assets) {
      try {
        processedCount++
        
        // Проверяем что это compressed NFT
        const isCompressed = asset.compression?.compressed === true
        
        if (!isCompressed) {
          console.log(`[getCompressedNFTs] ${processedCount}: Пропущен обычный NFT ${asset.id}`)
          continue // Пропускаем обычные NFT
        }
        
        compressedCount++
        console.log(`[getCompressedNFTs] ${processedCount}: Обрабатываем compressed NFT ${asset.id}`)

        // Извлекаем данные asset с улучшенной обработкой
        const metadata = asset.content?.metadata || {}
        const files = asset.content?.files || []
        const primaryFile = files.find((f: any) => f.uri) || files[0]
        
        // Пытаемся найти изображение в разных местах
        let imageUrl = ''
        if (primaryFile?.uri) {
          imageUrl = primaryFile.uri
        } else if (metadata.image) {
          imageUrl = metadata.image
        } else if (asset.content?.links?.image) {
          imageUrl = asset.content.links.image
        }

        // Улучшенное получение имени
        let assetName = metadata.name || ''
        if (!assetName && asset.content?.json_uri) {
          assetName = 'Compressed NFT'
        } else if (!assetName) {
          assetName = `cNFT #${asset.compression?.leaf_id || 'Unknown'}`
        }

        const nftData: NFTData = {
          mintAddress: asset.id, // Для compressed NFT используем assetId как mintAddress
          name: assetName,
          symbol: metadata.symbol || 'cNFT',
          uri: asset.content?.json_uri || '',
          image: imageUrl,
          description: metadata.description || '',
          collection: asset.grouping?.find((g: any) => g.group_key === 'collection')?.group_value || 'Compressed Collection',
          attributes: metadata.attributes || [],
          // Специфичные поля для compressed NFT
          isCompressed: true,
          treeId: asset.compression?.tree || '',
          leafIndex: asset.compression?.leaf_id || 0
        }

        // Добавляем только если есть осмысленные данные
        if (nftData.name && nftData.name.trim() !== '') {
          compressedNFTs.push(nftData)
          console.log(`[getCompressedNFTs] ✓ Compressed NFT: ${nftData.name}`)
        } else {
          console.log(`[getCompressedNFTs] ⚠️ Пропущен cNFT без имени: ${asset.id}`)
        }

      } catch (assetError) {
        console.error(`[getCompressedNFTs] Ошибка обработки asset:`, assetError)
        continue
      }
    }

    console.log(`[getCompressedNFTs] Обработано ${processedCount} ассетов, найдено ${compressedCount} compressed, добавлено ${compressedNFTs.length} валидных cNFT`)
    return compressedNFTs

  } catch (error) {
    console.error(`[getCompressedNFTs] Ошибка получения compressed NFT:`, error)
    // Возвращаем пустой массив вместо ошибки, чтобы обычные NFT всё равно загружались
    return []
  }
}

// Объединенная функция для получения всех NFT (обычных + compressed)
async function getAllNFTs(ownerAddress: string): Promise<NFTData[]> {
  try {
    console.log(`[getAllNFTs] Поиск всех NFT для кошелька: ${ownerAddress}`)
    
    // Запускаем параллельно получение обычных и compressed NFT
    const [standardNFTs, compressedNFTs] = await Promise.allSettled([
      getSolanaNFTs(ownerAddress),
      getCompressedNFTs(ownerAddress)
    ])

    const allNFTs: NFTData[] = []

    // Добавляем обычные NFT
    if (standardNFTs.status === 'fulfilled') {
      allNFTs.push(...standardNFTs.value)
      console.log(`[getAllNFTs] Добавлено ${standardNFTs.value.length} обычных NFT`)
    } else {
      console.error('[getAllNFTs] Ошибка получения обычных NFT:', standardNFTs.reason)
    }

    // Добавляем compressed NFT  
    if (compressedNFTs.status === 'fulfilled') {
      allNFTs.push(...compressedNFTs.value)
      console.log(`[getAllNFTs] Добавлено ${compressedNFTs.value.length} compressed NFT`)
    } else {
      console.error('[getAllNFTs] Ошибка получения compressed NFT:', compressedNFTs.reason)
    }

    // Убираем дубликаты по mintAddress (на всякий случай)
    const uniqueNFTs = allNFTs.filter((nft, index, self) => 
      index === self.findIndex(n => n.mintAddress === nft.mintAddress)
    )

    console.log(`[getAllNFTs] Итого уникальных NFT: ${uniqueNFTs.length}`)
    return uniqueNFTs

  } catch (error) {
    console.error(`[getAllNFTs] Критическая ошибка:`, error)
    throw error
  }
}

// In-memory storage for demo purposes
// In production, this would be stored in a database
let collections: any[] = []

export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      collections: collections,
      count: collections.length 
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields - теперь capacity тоже приходит автоматически
    const { name, treeAddress, capacity, minted } = body
    if (!name || !treeAddress || !capacity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, treeAddress, capacity' },
        { status: 400 }
      )
    }

    // Validate Solana address format
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{44}$/
    if (!solanaAddressRegex.test(treeAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Solana address format' },
        { status: 400 }
      )
    }

    // Check for duplicate tree addresses
    const existingCollection = collections.find(c => c.treeAddress === treeAddress)
    if (existingCollection) {
      return NextResponse.json(
        { success: false, error: 'Collection with this tree address already exists' },
        { status: 409 }
      )
    }

    // Create new collection из автоматически полученных данных
    const newCollection = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      description: body.description?.trim() || `Compressed NFT collection automatically imported`,
      treeAddress,
      metadataUri: body.metadataUri || '',
      totalCapacity: parseInt(capacity),
      mintedNFTs: parseInt(minted) || 0, // Используем фактическое количество заминченных
      queuedNFTs: 0,
      status: parseInt(minted) > 0 ? 'active' : 'imported', // Устанавливаем статус на основе количества заминченных
      createdAt: new Date().toISOString(),
      lastMinted: parseInt(minted) > 0 ? new Date().toISOString() : null,
      importedAt: new Date().toISOString(),
      // Дополнительные поля из автоимпорта
      symbol: body.symbol || 'CNFT',
      creator: body.creator || '',
      image: body.image || ''
    }

    // Add to collections
    collections.push(newCollection)

    console.log(`[POST] Коллекция импортирована: ${newCollection.name} (${newCollection.mintedNFTs}/${newCollection.totalCapacity})`)

    return NextResponse.json({ 
      success: true, 
      collection: newCollection,
      message: `Collection "${newCollection.name}" imported successfully with ${newCollection.mintedNFTs} minted NFTs`
    })
  } catch (error) {
    console.error('Error importing collection:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const collectionId = searchParams.get('id')
    
    if (!collectionId) {
      return NextResponse.json(
        { success: false, error: 'Collection ID required' },
        { status: 400 }
      )
    }

    const initialLength = collections.length
    collections = collections.filter(c => c.id !== collectionId)
    
    if (collections.length === initialLength) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Collection deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting collection:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 