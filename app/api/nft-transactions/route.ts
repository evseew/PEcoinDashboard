import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { serverCache, ServerCache } from '@/lib/server-cache'
import { getAlchemyUrl, getAlchemyKey } from '@/lib/alchemy/solana'

// --- Проверка конфигурации ---
if (!getAlchemyKey()) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
  console.error("!!! FATAL: ALCHEMY_API_KEY is not configured.        !!!")
  console.error("!!! The nft-transactions API endpoint will not work. !!!")
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
}
// ---

const ALCHEMY_URL = getAlchemyUrl()
const connection = new Connection(ALCHEMY_URL, 'confirmed')
const SPL_MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

interface NFTTransaction {
  signature: string
  type: 'NFT_TRANSFER' | 'NFT_MINT' | 'NFT_BURN'
  nftMint: string
  nftName: string
  nftImage?: string
  collection: string
  from: string
  to: string
  date: string
  blockTime: number
  verified: boolean
  memo?: string
}

// Кэширование
const cache = new Map<string, { data: any, timestamp: number }>()

/**
 * Извлекает memo из транзакции Solana
 */
function extractMemoFromTransaction(tx: any): string | undefined {
  try {
    // ✅ ПРАВИЛЬНЫЙ ПОДХОД: Ищем memo в логах программы
    if (tx.meta?.logMessages) {
      for (const log of tx.meta.logMessages) {
        // Ищем лог формата: "Program log: Memo (len X): "текст""
        const memoMatch = log.match(/Program log: Memo \(len \d+\): "(.+)"/);
        if (memoMatch && memoMatch[1]) {
          const memo = memoMatch[1].trim();
          console.log(`[extractMemoFromTransaction] ✅ Memo найден в логах: "${memo}"`);
          return memo;
        }
        
        // Альтернативный формат без кавычек: "Program log: Memo (len X): текст"
        const simpleMemoMatch = log.match(/Program log: Memo \(len \d+\): (.+)/);
        if (simpleMemoMatch && simpleMemoMatch[1]) {
          const memo = simpleMemoMatch[1].trim();
          // Убираем кавычки если они есть в начале и конце
          const cleanMemo = memo.replace(/^["']|["']$/g, '');
          console.log(`[extractMemoFromTransaction] ✅ Memo найден в логах (простой формат): "${cleanMemo}"`);
          return cleanMemo;
        }
        
        // Дополнительный поиск более простого формата
        if (log.includes('Program log:') && log.includes('Memo')) {
          console.log(`[extractMemoFromTransaction] 🔍 Потенциальный memo лог: "${log}"`);
        }
      }
    }
    
    console.log(`[extractMemoFromTransaction] ❌ Memo не найден в логах транзакции`);
    return undefined;
  } catch (error) {
    console.warn(`[extractMemoFromTransaction] Ошибка поиска memo в логах: ${error}`);
    return undefined;
  }
}

function getCachedData(type: string, key: string): any | null {
  const cacheKey = `${type}:${key}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < 60000) { // 1 минута
    return cached.data
  }
  
  cache.delete(cacheKey)
  return null
}

function setCachedData(type: string, key: string, data: any, ttlMinutes: number = 1): void {
  const cacheKey = `${type}:${key}`
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  })
}

// Получение подписей транзакций
async function getTransactionSignatures(walletAddress: string, limit: number): Promise<string[]> {
  try {
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(walletAddress),
      { limit }
    )
    
    return signatures.map(sig => sig.signature)
  } catch (error) {
    console.error('[getTransactionSignatures] Ошибка:', error)
    return []
  }
}

async function getNFTTransactions(walletAddress: string, limit: number = 10): Promise<NFTTransaction[]> {
  try {
    console.log(`[getNFTTransactions] Поиск NFT транзакций для: ${walletAddress}`)
    
    // Кэширование
    const cacheKey = `limit:${limit}|wallet:${walletAddress}`
    const cachedData = getCachedData('NFT_TRANSACTIONS', cacheKey)
    if (cachedData) {
      console.log('🎯 Cache HIT: nft-transactions:', cacheKey)
      return cachedData
    }
    
    // Получаем подписи транзакций
    const signatures = await getTransactionSignatures(walletAddress, limit * 5) // Берем больше для фильтрации
    console.log(`[getNFTTransactions] Получено ${signatures.length} подписей`)
    
    const nftTransactions: NFTTransaction[] = []
    
    // Обрабатываем транзакции батчами
    const batchSize = 10
    for (let i = 0; i < Math.min(signatures.length, 50); i += batchSize) {
      const batch = signatures.slice(i, i + batchSize)
      
      try {
        const parsedTransactions = await connection.getParsedTransactions(
          batch,
          {
            maxSupportedTransactionVersion: 1,
            commitment: 'confirmed'
          }
        )
        
        for (let j = 0; j < parsedTransactions.length; j++) {
          const tx = parsedTransactions[j]
          if (!tx?.meta || tx.meta.err) continue
          
          const signature = batch[j]
          const blockTime = tx.blockTime || 0
          
          console.log(`\n[getNFTTransactions] 🔍 Анализ транзакции: ${signature}`)
          
          // Извлекаем memo из транзакции
          const memo = extractMemoFromTransaction(tx)
          
          // Парсим Standard/Core NFT транзакции
           const standardNFTs = await parseStandardNFTTransfers(tx.meta, tx, walletAddress, blockTime, memo)
           nftTransactions.push(...standardNFTs)
          
          // Парсим Compressed NFT транзакции (несколько методов)
          const compressedNFTs = await parseAllCompressedNFTMethods(tx, walletAddress, blockTime, signature, memo)
          nftTransactions.push(...compressedNFTs)
        }
      } catch (error) {
        console.error(`[getNFTTransactions] Ошибка обработки батча:`, error)
      }
    }
    
    // Сортируем по времени и ограничиваем результат
    const sortedTransactions = nftTransactions
      .sort((a, b) => b.blockTime - a.blockTime)
      .slice(0, limit)
    
    console.log(`[getNFTTransactions] 🎯 Итого найдено NFT транзакций: ${sortedTransactions.length}`)
    
    // Кэшируем результат
    setCachedData('NFT_TRANSACTIONS', cacheKey, sortedTransactions, 1) // 1 минута
    
    return sortedTransactions
    
  } catch (error) {
    console.error('[getNFTTransactions] Ошибка:', error)
    return []
  }
}

async function parseNFTTransfersFromTransaction(transaction: any, userWallet: string): Promise<NFTTransaction[]> {
  const nftTransfers: NFTTransaction[] = []
  
  try {
    const { meta, transaction: tx, blockTime } = transaction
    
    // 1. Стандартные NFT через token balance changes
    if (meta?.preTokenBalances && meta?.postTokenBalances) {
      const standardNFTs = await parseStandardNFTTransfers(meta, tx, userWallet, blockTime)
      nftTransfers.push(...standardNFTs)
    }
    
    // 2. Compressed NFT через program logs
    if (meta?.logMessages) {
      const compressedNFTs = await parseCompressedNFTTransfers(meta.logMessages, tx, userWallet, blockTime)
      nftTransfers.push(...compressedNFTs)
    }
    
  } catch (error) {
    console.error('[parseNFTTransfersFromTransaction] Ошибка парсинга:', error)
  }
  
  return nftTransfers
}

// Парсинг стандартных NFT (текущая логика)
async function parseStandardNFTTransfers(meta: any, tx: any, userWallet: string, blockTime: number, memo?: string): Promise<NFTTransaction[]> {
  const nftTransfers: NFTTransaction[] = []
  
  // Анализируем изменения token balances для обнаружения NFT трансферов
  const tokenChanges = new Map<string, { pre: any, post: any }>()
  
  // Собираем pre балансы
  meta.preTokenBalances.forEach((balance: any) => {
    const mint = balance.mint
    if (!tokenChanges.has(mint)) {
      tokenChanges.set(mint, { pre: balance, post: null })
    } else {
      tokenChanges.get(mint)!.pre = balance
    }
  })
  
  // Собираем post балансы
  meta.postTokenBalances.forEach((balance: any) => {
    const mint = balance.mint
    if (!tokenChanges.has(mint)) {
      tokenChanges.set(mint, { pre: null, post: balance })
    } else {
      tokenChanges.get(mint)!.post = balance
    }
  })
  
  // Анализируем изменения для каждого токена
  for (const [mint, changes] of tokenChanges) {
    const { pre, post } = changes
    
    // Проверяем, что это NFT (decimals = 0 и изменение amount = 1)
    const isNFT = (pre?.uiTokenAmount?.decimals === 0 || post?.uiTokenAmount?.decimals === 0)
    
    if (!isNFT) continue
    
    const preAmount = pre?.uiTokenAmount?.uiAmount || 0
    const postAmount = post?.uiTokenAmount?.uiAmount || 0
    
    // Определяем тип операции
    let transferType: 'NFT_TRANSFER' | 'NFT_MINT' | 'NFT_BURN' = 'NFT_TRANSFER'
    let from = ''
    let to = ''
    
    if (preAmount === 0 && postAmount === 1) {
      // Mint или получение
      transferType = 'NFT_MINT'
      to = tx.message.accountKeys[post.accountIndex]?.toBase58() || ''
    } else if (preAmount === 1 && postAmount === 0) {
      // Burn или отправка
      transferType = 'NFT_BURN'
      from = tx.message.accountKeys[pre.accountIndex]?.toBase58() || ''
    } else if (preAmount !== postAmount) {
      // Трансфер
      transferType = 'NFT_TRANSFER'
      from = pre ? tx.message.accountKeys[pre.accountIndex]?.toBase58() || '' : ''
      to = post ? tx.message.accountKeys[post.accountIndex]?.toBase58() || '' : ''
    }
    
    // Проверяем, что наш кошелек участвует в транзакции
    const isUserInvolved = from.includes(userWallet) || to.includes(userWallet) || 
                         tx.message.accountKeys.some((key: any) => key.toBase58() === userWallet)
    
    if (!isUserInvolved) continue
    
    // Получаем метаданные NFT
    const nftMetadata = await getNFTMetadataForTransaction(mint)
    
    const nftTransaction: NFTTransaction = {
      signature: tx.signatures[0],
      type: transferType,
      nftMint: mint,
      nftName: nftMetadata?.name || 'Unknown NFT',
      nftImage: nftMetadata?.image,
      collection: nftMetadata?.collection || 'Unknown Collection',
      from,
      to,
      date: blockTime ? new Date(blockTime * 1000).toISOString() : new Date().toISOString(),
      blockTime: blockTime || 0,
      verified: nftMetadata?.verified || false,
      memo: memo
    }
    
    nftTransfers.push(nftTransaction)
  }
  
  return nftTransfers
}

// Парсинг Compressed NFT через program logs
async function parseCompressedNFTTransfers(logMessages: string[], tx: any, userWallet: string, blockTime: number): Promise<NFTTransaction[]> {
  const nftTransfers: NFTTransaction[] = []
  
  try {
    const BUBBLEGUM_PROGRAM_ID = 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
    const SPL_NOOP_PROGRAM_ID = 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'
    
    console.log(`[parseCompressedNFTTransfers] Анализ transaction: ${tx.signatures[0]}`)
    console.log(`[parseCompressedNFTTransfers] Всего программ в транзакции: ${tx.message.accountKeys?.length || 0}`)
    
    // Логируем все программы в транзакции
    if (tx.message.instructions) {
      console.log(`[parseCompressedNFTTransfers] Инструкции в транзакции:`)
      tx.message.instructions.forEach((ix: any, index: number) => {
        const programId = tx.message.accountKeys[ix.programIdIndex]?.toBase58()
        console.log(`  ${index}: Program ${programId}`)
      })
    }
    
    // Ищем Bubblegum program в инструкциях
    const hasBubblegumInstruction = tx.message.instructions?.some((ix: any) => {
      const programId = tx.message.accountKeys[ix.programIdIndex]?.toBase58()
      return programId === BUBBLEGUM_PROGRAM_ID
    })
    
    console.log(`[parseCompressedNFTTransfers] Bubblegum instruction найдена: ${hasBubblegumInstruction}`)
    
    if (!hasBubblegumInstruction) {
      console.log(`[parseCompressedNFTTransfers] Нет Bubblegum инструкций, пропускаем`)
      return []
    }
    
    console.log(`[parseCompressedNFTTransfers] Анализ ${logMessages.length} логов:`)
    
    // Ищем NoOp logs с данными о cNFT
    for (const [index, log] of logMessages.entries()) {
      console.log(`  Log ${index}: ${log}`)
      
      // Ищем разные типы логов
      if (log.includes('Program data:') || log.includes('Program log:') || log.includes('Invoke')) {
        console.log(`    ^ Потенциально важный лог`)
        
        // Ищем лог с данными от SPL NoOp program
        if (log.includes('Program data:')) {
          try {
            // Извлекаем base64 данные из лога
            const dataMatch = log.match(/Program data: (.+)/)
            if (dataMatch) {
              const base64Data = dataMatch[1]
              console.log(`    Base64 data: ${base64Data.substring(0, 50)}...`)
              
              const decodedData = Buffer.from(base64Data, 'base64')
              console.log(`    Decoded length: ${decodedData.length} bytes`)
              console.log(`    First 16 bytes: ${decodedData.slice(0, 16).toString('hex')}`)
              
              // Парсим Compressed NFT событие
              const cNFTEvent = parseCompressedNFTEvent(decodedData)
              if (cNFTEvent) {
                console.log(`    ✓ Parsed cNFT event:`, cNFTEvent)
                
                // Проверяем участие пользователя
                const isUserInvolved = 
                  cNFTEvent.leafOwner === userWallet ||
                  cNFTEvent.leafDelegate === userWallet ||
                  cNFTEvent.previousLeafOwner === userWallet
                
                console.log(`    User involved: ${isUserInvolved}`)
                
                if (isUserInvolved) {
                  // Определяем тип операции
                  let transferType: 'NFT_TRANSFER' | 'NFT_MINT' | 'NFT_BURN' = 'NFT_TRANSFER'
                  let from = ''
                  let to = ''
                  
                  if (cNFTEvent.eventType === 'mint') {
                    transferType = 'NFT_MINT'
                    to = cNFTEvent.leafOwner
                  } else if (cNFTEvent.eventType === 'transfer') {
                    transferType = 'NFT_TRANSFER'
                    from = cNFTEvent.previousLeafOwner || ''
                    to = cNFTEvent.leafOwner
                  } else if (cNFTEvent.eventType === 'burn') {
                    transferType = 'NFT_BURN'
                    from = cNFTEvent.previousLeafOwner || cNFTEvent.leafOwner
                  }
                  
                  const nftTransaction: NFTTransaction = {
                    signature: tx.signatures[0],
                    type: transferType,
                    nftMint: cNFTEvent.assetId || `compressed_${cNFTEvent.treeId}_${cNFTEvent.leafIndex}`,
                    nftName: cNFTEvent.metadata?.name || 'Compressed NFT',
                    nftImage: cNFTEvent.metadata?.image,
                    collection: cNFTEvent.metadata?.collection || 'Compressed Collection',
                    from,
                    to,
                    date: blockTime ? new Date(blockTime * 1000).toISOString() : new Date().toISOString(),
                    blockTime: blockTime || 0,
                    verified: false // TODO: Добавить проверку верификации для cNFT
                  }
                  
                  nftTransfers.push(nftTransaction)
                  console.log(`    ✓ Добавлена cNFT транзакция: ${nftTransaction.nftName}`)
                }
              } else {
                console.log(`    ✗ Не удалось распарсить cNFT event`)
              }
            }
          } catch (error) {
            // Игнорируем ошибки парсинга отдельных логов
            console.error(`    ✗ Ошибка парсинга лога:`, error)
          }
        }
      }
    }
    
    console.log(`[parseCompressedNFTTransfers] Итого найдено cNFT транзакций: ${nftTransfers.length}`)
    
  } catch (error) {
    console.error('[parseCompressedNFTTransfers] Ошибка:', error)
  }
  
  return nftTransfers
}

// Парсинг Compressed NFT события из NoOp data
function parseCompressedNFTEvent(data: Buffer): {
  eventType: 'mint' | 'transfer' | 'burn'
  treeId: string
  leafIndex: number
  leafOwner: string
  leafDelegate?: string
  previousLeafOwner?: string
  assetId?: string
  metadata?: {
    name: string
    image?: string
    collection?: string
  }
} | null {
  try {
    console.log(`[parseCompressedNFTEvent] Парсинг ${data.length} bytes`)
    console.log(`[parseCompressedNFTEvent] Raw hex: ${data.toString('hex')}`)
    
    if (data.length < 32) {
      console.log(`[parseCompressedNFTEvent] Слишком мало данных: ${data.length} bytes`)
      return null
    }
    
    // Проверяем на разные типы событий
    let eventType: 'mint' | 'transfer' | 'burn' = 'transfer'
    let offset = 0
    
    // Пробуем найти известные patterns для Bubblegum событий
    const dataHex = data.toString('hex')
    
    // Известные discriminators для Bubblegum (примерные)
    const MINT_DISCRIMINATORS = [
      '919460c6b893766b', // MintV1
      '92c2b49893ab9c24', // MintToCollectionV1
    ]
    
    const TRANSFER_DISCRIMINATORS = [
      'a334c8e78c0345ba', // Transfer 
      'eb677294f4ee2f37', // TransferV1
    ]
    
    const BURN_DISCRIMINATORS = [
      '746e1d386bdba95d', // Burn
      'b663dd5b5d5c8bb3', // BurnV1
    ]
    
    // Проверяем discriminators в разных позициях
    for (let pos = 0; pos <= Math.min(data.length - 8, 16); pos++) {
      const slice = data.slice(pos, pos + 8).toString('hex')
      console.log(`[parseCompressedNFTEvent] Checking discriminator at ${pos}: ${slice}`)
      
      if (MINT_DISCRIMINATORS.includes(slice)) {
        eventType = 'mint'
        offset = pos + 8
        console.log(`[parseCompressedNFTEvent] Found MINT discriminator at ${pos}`)
        break
      } else if (TRANSFER_DISCRIMINATORS.includes(slice)) {
        eventType = 'transfer'
        offset = pos + 8
        console.log(`[parseCompressedNFTEvent] Found TRANSFER discriminator at ${pos}`)
        break
      } else if (BURN_DISCRIMINATORS.includes(slice)) {
        eventType = 'burn'
        offset = pos + 8
        console.log(`[parseCompressedNFTEvent] Found BURN discriminator at ${pos}`)
        break
      }
    }
    
    // Если не нашли discriminator, пробуем парсить как структурированные данные
    if (offset === 0) {
      console.log(`[parseCompressedNFTEvent] Discriminator не найден, пробуем общий парсинг`)
      
      // Ищем 32-байтовые структуры (вероятные публичные ключи)
      const pubkeyPositions = []
      for (let i = 0; i <= data.length - 32; i += 4) {
        const slice = data.slice(i, i + 32)
        // Проверяем что это может быть публичный ключ (не все нули, не все 255)
        if (!slice.every((b: number) => b === 0) && !slice.every((b: number) => b === 255)) {
          try {
            const pubkey = new PublicKey(slice).toBase58()
            if (pubkey.length === 44) { // Валидная длина base58 pubkey
              pubkeyPositions.push({ position: i, pubkey })
              console.log(`[parseCompressedNFTEvent] Possible pubkey at ${i}: ${pubkey}`)
            }
          } catch (e) {
            // Не публичный ключ
          }
        }
      }
      
      if (pubkeyPositions.length >= 2) {
        // Предполагаем что первый pubkey - tree, второй - owner
        const treeId = pubkeyPositions[0].pubkey
        const leafOwner = pubkeyPositions[1].pubkey
        
        console.log(`[parseCompressedNFTEvent] Создаем базовое событие: tree=${treeId}, owner=${leafOwner}`)
        
        return {
          eventType: 'transfer', // По умолчанию
          treeId,
          leafIndex: 0, // Не можем определить точно
          leafOwner,
          metadata: {
            name: `Compressed NFT`,
            collection: 'Compressed Collection'
          }
        }
      }
    }
    
    // Если нашли discriminator, пробуем парсить структуру
    if (offset > 0 && offset + 64 <= data.length) {
      try {
        // Читаем tree ID (32 bytes)
        const treeId = new PublicKey(data.slice(offset, offset + 32)).toBase58()
        offset += 32
        
        // Читаем leaf owner (32 bytes)  
        const leafOwner = new PublicKey(data.slice(offset, offset + 32)).toBase58()
        offset += 32
        
        // Пробуем найти leaf index (может быть в разных позициях)
        let leafIndex = 0
        if (offset + 4 <= data.length) {
          leafIndex = data.readUInt32LE(offset)
        }
        
        console.log(`[parseCompressedNFTEvent] Успешно распарсили: ${eventType}, tree=${treeId}, owner=${leafOwner}, index=${leafIndex}`)
        
        return {
          eventType,
          treeId,
          leafIndex,
          leafOwner,
          metadata: {
            name: `Compressed NFT #${leafIndex}`,
            collection: 'Compressed Collection'
          }
        }
      } catch (error) {
        console.error(`[parseCompressedNFTEvent] Ошибка парсинга структуры:`, error)
      }
    }
    
    console.log(`[parseCompressedNFTEvent] Не удалось распарсить данные`)
    return null
    
  } catch (error) {
    console.error('[parseCompressedNFTEvent] Ошибка парсинга:', error)
    return null
  }
}

async function getNFTMetadataForTransaction(mint: string): Promise<{
  name: string
  image?: string
  collection: string
  verified: boolean
} | null> {
  try {
    // Пытаемся найти metadata account
    const metadataPDA = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
        new PublicKey(mint).toBuffer()
      ],
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    )
    
    const metadataAccount = await connection.getAccountInfo(metadataPDA[0])
    
    if (metadataAccount?.data) {
      // Упрощенный парсинг для получения URI
      const metadata = parseSimpleMetadata(metadataAccount.data)
      
      if (metadata.uri && metadata.uri.startsWith('http')) {
        try {
          const response = await fetch(metadata.uri, {
            headers: { 'User-Agent': 'PEcoin-Dashboard/1.0' },
            signal: AbortSignal.timeout(5000) // Короткий таймаут для транзакций
          })
          
          if (response.ok) {
            const externalMetadata = await response.json()
            
            return {
              name: metadata.name || externalMetadata?.name || 'Unknown NFT',
              image: externalMetadata?.image,
              collection: externalMetadata?.collection?.name || 'Unknown Collection',
              verified: false // TODO: Реализовать проверку верификации
            }
          }
        } catch (error) {
          // Игнорируем ошибки загрузки внешних метаданных для транзакций
        }
      }
      
      return {
        name: metadata.name || 'Unknown NFT',
        collection: 'Unknown Collection',
        verified: false
      }
    }
  } catch (error) {
    console.error(`[getNFTMetadataForTransaction] Ошибка для ${mint}:`, error)
  }
  
  return null
}

function parseSimpleMetadata(data: Buffer): { name: string; symbol: string; uri: string } {
  try {
    let offset = 1 // key
    offset += 32 // update_authority
    offset += 32 // mint
    
    // Читаем name
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
    return { name: '', symbol: '', uri: '' }
  }
}

// Парсинг всех методов Compressed NFT  
async function parseAllCompressedNFTMethods(tx: any, userWallet: string, blockTime: number, signature: string, memo?: string): Promise<NFTTransaction[]> {
  const results: NFTTransaction[] = []
  
  try {
    console.log(`[parseAllCompressedNFTMethods] 🔍 Проверяю транзакцию: ${signature}`)
    
    const BUBBLEGUM_PROGRAM_ID = 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
    const SPL_NOOP_PROGRAM_ID = 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'
    
    // Добавляем проверку существования структуры транзакции
    if (!tx || !tx.transaction || !tx.meta) {
      console.warn('Transaction data incomplete:', tx);
      return results;
    }

    // Проверяем разные форматы структуры транзакции
    let accountKeys: Array<any>;
    
    if ('message' in tx.transaction && tx.transaction.message) {
      // Новый формат с message
      accountKeys = tx.transaction.message.accountKeys;
    } else if ('accountKeys' in tx.transaction) {
      // Старый формат с прямыми accountKeys  
      accountKeys = tx.transaction.accountKeys as Array<any>;
    } else {
      console.warn('Could not find accountKeys in transaction:', tx.transaction);
      return results;
    }

    if (!accountKeys || !Array.isArray(accountKeys)) {
      console.warn('AccountKeys not found or invalid:', accountKeys);
      return results;
    }
    
    // Проверяем, есть ли Bubblegum или NoOp program в транзакции
    let hasBubblegumProgram = false
    let hasNoOpProgram = false
    
    if (accountKeys) {
      for (const key of accountKeys) {
        const keyStr = key?.toBase58 ? key.toBase58() : key?.toString()
        if (keyStr === BUBBLEGUM_PROGRAM_ID) {
          hasBubblegumProgram = true
          console.log(`[parseAllCompressedNFTMethods] ✅ Bubblegum program найден в accountKeys`)
        }
        if (keyStr === SPL_NOOP_PROGRAM_ID) {
          hasNoOpProgram = true
          console.log(`[parseAllCompressedNFTMethods] ✅ SPL NoOp program найден в accountKeys`)
        }
      }
    }
    
    // Проверяем инструкции
    if (tx.message?.instructions) {
      for (const ix of tx.message.instructions) {
        const programId = tx.message.accountKeys[ix.programIdIndex]?.toBase58?.()
        if (programId === BUBBLEGUM_PROGRAM_ID) {
          hasBubblegumProgram = true
          console.log(`[parseAllCompressedNFTMethods] ✅ Bubblegum instruction найдена`)
        }
        if (programId === SPL_NOOP_PROGRAM_ID) {
          hasNoOpProgram = true
          console.log(`[parseAllCompressedNFTMethods] ✅ SPL NoOp instruction найдена`)
        }
      }
    }
    
    // Проверяем inner instructions
    if (tx.meta?.innerInstructions) {
      for (const inner of tx.meta.innerInstructions) {
        for (const ix of inner.instructions) {
          const programId = accountKeys[ix.programIdIndex]?.toBase58?.() ||
                           accountKeys[ix.programIdIndex]?.toString?.()
          if (programId === BUBBLEGUM_PROGRAM_ID) {
            hasBubblegumProgram = true
            console.log(`[parseAllCompressedNFTMethods] ✅ Bubblegum inner instruction найдена`)
          }
          if (programId === SPL_NOOP_PROGRAM_ID) {
            hasNoOpProgram = true
            console.log(`[parseAllCompressedNFTMethods] ✅ SPL NoOp inner instruction найдена`)
          }
        }
      }
    }
    
    console.log(`[parseAllCompressedNFTMethods] Programs found: Bubblegum=${hasBubblegumProgram}, NoOp=${hasNoOpProgram}`)
    
    // Если есть хоть одна из программ, это потенциально compressed NFT транзакция
    if (hasBubblegumProgram || hasNoOpProgram) {
      console.log(`[parseAllCompressedNFTMethods] 🎯 Потенциальная compressed NFT транзакция обнаружена!`)
      
      // Метод 1: Поиск через логи программы
      if (tx.meta?.logMessages) {
        console.log(`[parseAllCompressedNFTMethods] Анализ ${tx.meta.logMessages.length} логов...`)
        const logResults = await parseCompressedNFTTransfers(tx.meta.logMessages, tx, userWallet, blockTime)
        results.push(...logResults)
      }
      
      // Метод 2: Поиск через SPL NoOp program напрямую
      const noopResults = await parseNoOpProgramLogs(tx, userWallet, blockTime, signature)
      results.push(...noopResults)
      
      // Метод 3: Поиск через изменения в accounts
      const accountResults = await parseAccountChanges(tx, userWallet, blockTime, signature)
      results.push(...accountResults)
      
      // Метод 4: Простое создание транзакции если пользователь участвует
      if (results.length === 0) {
        // Проверяем, участвует ли пользователь в транзакции
        const userInvolved = accountKeys?.some((key: any) => {
          const keyStr = key?.toBase58 ? key.toBase58() : key?.toString()
          return keyStr === userWallet
        })
        
        if (userInvolved) {
          console.log(`[parseAllCompressedNFTMethods] 🔄 Пользователь участвует, создаем базовую compressed NFT транзакцию`)
          
          const basicNFTTransaction: NFTTransaction = {
            signature,
            type: 'NFT_TRANSFER',
            nftMint: `compressed_${signature.substring(0, 8)}`,
            nftName: 'Compressed NFT Transaction',
            collection: 'Compressed Collection',
            from: '',
            to: userWallet,
            date: blockTime ? new Date(blockTime * 1000).toISOString() : new Date().toISOString(),
            blockTime: blockTime || 0,
            verified: false
          }
          
          results.push(basicNFTTransaction)
          console.log(`[parseAllCompressedNFTMethods] ✅ Создана базовая compressed NFT транзакция`)
        }
      }
    }
    
    // Удаляем дубликаты
    const uniqueResults = results.filter((item, index, self) => 
      index === self.findIndex(t => t.signature === item.signature && t.nftMint === item.nftMint)
    )
    
    if (uniqueResults.length > 0) {
      console.log(`[parseAllCompressedNFTMethods] 🎉 ИТОГО найдено ${uniqueResults.length} compressed NFT транзакций!`)
    }
    
    return uniqueResults
    
  } catch (error) {
    console.error('[parseAllCompressedNFTMethods] Ошибка:', error)
    return []
  }
}

// Метод 2: Поиск через SPL NoOp program напрямую
async function parseNoOpProgramLogs(tx: any, userWallet: string, blockTime: number, signature: string): Promise<NFTTransaction[]> {
  const nftTransfers: NFTTransaction[] = []
  
  try {
    const SPL_NOOP_PROGRAM_ID = 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'
    
    // Получаем accountKeys и instructions
    let accountKeys: any[];
    let instructions: any[];
    
    if ('message' in tx.transaction && tx.transaction.message) {
      accountKeys = tx.transaction.message.accountKeys;
      instructions = tx.transaction.message.instructions || [];
    } else {
      accountKeys = tx.transaction.accountKeys || [];
      instructions = tx.transaction.instructions || [];
    }
    
    // Ищем SPL NoOp program в инструкциях
    const hasNoOpInstructions = instructions.some((ix: any) => {
      const programId = accountKeys[ix.programIdIndex]?.toBase58?.() ||
                       accountKeys[ix.programIdIndex]?.toString?.()
      return programId === SPL_NOOP_PROGRAM_ID
    })
    
    console.log(`[parseNoOpProgramLogs] SPL NoOp найден: ${hasNoOpInstructions}`)
    
    if (!hasNoOpInstructions) return []
    
    // Анализируем все NoOp инструкции
    for (const ix of instructions) {
      const programId = accountKeys[ix.programIdIndex]?.toBase58?.() ||
                       accountKeys[ix.programIdIndex]?.toString?.()
      
      if (programId === SPL_NOOP_PROGRAM_ID && ix.data) {
        console.log(`[parseNoOpProgramLogs] Анализ NoOp data: ${ix.data}`)
        
        try {
          // Декодируем данные инструкции
          const dataBuffer = Buffer.from(ix.data, 'base64')
          console.log(`[parseNoOpProgramLogs] Decoded ${dataBuffer.length} bytes: ${dataBuffer.toString('hex')}`)
          
          // Пробуем парсить как compressed NFT event
          const cNFTEvent = parseCompressedNFTEvent(dataBuffer)
          if (cNFTEvent) {
            console.log(`[parseNoOpProgramLogs] ✅ Parsed NoOp cNFT event:`, cNFTEvent)
            
            // Проверяем участие пользователя
            const isUserInvolved = 
              cNFTEvent.leafOwner === userWallet ||
              cNFTEvent.leafDelegate === userWallet ||
              cNFTEvent.previousLeafOwner === userWallet
            
            if (isUserInvolved) {
              const nftTransaction: NFTTransaction = {
                signature,
                type: cNFTEvent.eventType === 'mint' ? 'NFT_MINT' : 
                      cNFTEvent.eventType === 'burn' ? 'NFT_BURN' : 'NFT_TRANSFER',
                nftMint: cNFTEvent.assetId || `compressed_${cNFTEvent.treeId}_${cNFTEvent.leafIndex}`,
                nftName: cNFTEvent.metadata?.name || `Compressed NFT #${cNFTEvent.leafIndex}`,
                nftImage: cNFTEvent.metadata?.image,
                collection: cNFTEvent.metadata?.collection || 'Compressed Collection',
                from: cNFTEvent.previousLeafOwner || '',
                to: cNFTEvent.leafOwner,
                date: blockTime ? new Date(blockTime * 1000).toISOString() : new Date().toISOString(),
                blockTime: blockTime || 0,
                verified: false
              }
              
              nftTransfers.push(nftTransaction)
              console.log(`[parseNoOpProgramLogs] ✅ Добавлена NoOp cNFT транзакция`)
            }
          }
        } catch (error) {
          console.error('[parseNoOpProgramLogs] Ошибка парсинга NoOp data:', error)
        }
      }
    }
    
  } catch (error) {
    console.error('[parseNoOpProgramLogs] Ошибка:', error)
  }
  
  return nftTransfers
}

// Метод 3: Поиск через изменения в accounts
async function parseAccountChanges(tx: any, userWallet: string, blockTime: number, signature: string): Promise<NFTTransaction[]> {
  const nftTransfers: NFTTransaction[] = []
  
  try {
    const BUBBLEGUM_PROGRAM_ID = 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
    
    // Получаем accountKeys
    let accountKeys: any[];
    
    if ('message' in tx.transaction && tx.transaction.message) {
      accountKeys = tx.transaction.message.accountKeys;
    } else {
      accountKeys = tx.transaction.accountKeys || [];
    }
    
    // Проверяем есть ли Bubblegum program в аккаунтах
    const bubblegumAccounts = accountKeys.filter((key: any) => {
      const keyStr = key?.toBase58?.() || key?.toString?.()
      return keyStr === BUBBLEGUM_PROGRAM_ID
    })
    
    if (!bubblegumAccounts?.length) return []
    
    console.log(`[parseAccountChanges] Bubblegum program найден в accounts`)
    
    // Ищем изменения в account data, которые могут указывать на compressed NFT операции
    if (tx.meta?.preTokenBalances && tx.meta?.postTokenBalances) {
      const preBalances = tx.meta.preTokenBalances
      const postBalances = tx.meta.postTokenBalances
      
      // Ищем аккаунты пользователя, которые изменились
      for (const preBalance of preBalances) {
        if (preBalance.owner === userWallet) {
          const postBalance = postBalances.find((post: any) => 
            post.accountIndex === preBalance.accountIndex
          )
          
          if (postBalance && preBalance.uiTokenAmount.amount !== postBalance.uiTokenAmount.amount) {
            console.log(`[parseAccountChanges] Обнаружено изменение баланса для ${userWallet}`)
            
            // Это может быть compressed NFT транзакция
            const nftTransaction: NFTTransaction = {
              signature,
              type: 'NFT_TRANSFER',
              nftMint: `compressed_change_${preBalance.accountIndex}`,
              nftName: 'Compressed NFT (Change Detected)',
              collection: 'Compressed Collection',
              from: userWallet,
              to: userWallet,
              date: blockTime ? new Date(blockTime * 1000).toISOString() : new Date().toISOString(),
              blockTime: blockTime || 0,
              verified: false
            }
            
            nftTransfers.push(nftTransaction)
          }
        }
      }
    }
    
    // Если есть innerInstructions, ищем там тоже
    if (tx.meta?.innerInstructions) {
      for (const inner of tx.meta.innerInstructions) {
        for (const ix of inner.instructions) {
          const programId = tx.message.accountKeys[ix.programIdIndex]?.toBase58?.()
          if (programId === BUBBLEGUM_PROGRAM_ID) {
            console.log(`[parseAccountChanges] Найден inner Bubblegum instruction`)
            
            const nftTransaction: NFTTransaction = {
              signature,
              type: 'NFT_TRANSFER',
              nftMint: `compressed_inner_${inner.index}`,
              nftName: 'Compressed NFT (Inner Instruction)',
              collection: 'Compressed Collection',
              from: '',
              to: userWallet,
              date: blockTime ? new Date(blockTime * 1000).toISOString() : new Date().toISOString(),
              blockTime: blockTime || 0,
              verified: false
            }
            
            nftTransfers.push(nftTransaction)
          }
        }
      }
    }
    
  } catch (error) {
    console.error('[parseAccountChanges] Ошибка:', error)
  }
  
  return nftTransfers
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, limit } = await request.json()
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }
    
    // Валидация адреса
    try {
      new PublicKey(walletAddress)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      )
    }
    
    console.log(`[NFT Transactions API] Запрос для кошелька: ${walletAddress}`)
    
    // Создаем ключ для кэша
    const cacheKey = ServerCache.createKey('nft-transactions', { 
      wallet: walletAddress, 
      limit: limit || 10 
    })
    
    // Получаем данные с кэшированием
    const transactions = await serverCache.getOrFetch(
      cacheKey,
      () => getNFTTransactions(walletAddress, limit || 10),
      'NFT_TRANSACTIONS' // Новый тип кэша
    )
    
    console.log(`[NFT Transactions API] Возвращено ${transactions.length} NFT транзакций`)
    
    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length
    })
    
  } catch (error) {
    console.error('[NFT Transactions API] Ошибка:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch NFT transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 