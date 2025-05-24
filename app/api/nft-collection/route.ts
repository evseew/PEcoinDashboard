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
              attributes: externalMetadata?.attributes || []
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

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }
    
    console.log(`[API] Запрос NFT для кошелька: ${walletAddress}`)
    
    // Валидация адреса
    try {
      new PublicKey(walletAddress)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      )
    }
    
    // Создаем ключ для кэша
    const cacheKey = ServerCache.createKey('nft-collection', { wallet: walletAddress })
    
    // Получаем данные с кэшированием
    const nfts = await serverCache.getOrFetch(
      cacheKey,
      () => getSolanaNFTs(walletAddress),
      'NFT_COLLECTION'
    )
    
    console.log(`[API] Возвращено ${nfts.length} NFT для кошелька ${walletAddress}`)
    
    return NextResponse.json({
      success: true,
      nfts,
      count: nfts.length,
      cached: true // Индикатор что используется кэш
    })
    
  } catch (error) {
    console.error('[API] Ошибка получения NFT:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch NFTs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 