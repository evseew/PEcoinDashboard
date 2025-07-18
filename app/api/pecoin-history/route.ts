import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js"; // Используем Connection
import { getAlchemyKey, getAlchemyUrl } from '@/lib/alchemy/solana'
import { serverCache } from '@/lib/server-cache'
import { walletNameResolver } from "@/lib/wallet-name-resolver"
import { dynamicEcosystemCache } from "@/lib/dynamic-ecosystem-cache"

// --- Проверка конфигурации ---
if (!getAlchemyKey()) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
  console.error("!!! FATAL: ALCHEMY_API_KEY is not configured.        !!!")
  console.error("!!! The pecoin-history API endpoint will not work.   !!!")
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
}
// ---

// --- Константы ---
const PECOIN_MINT = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"; // PEcoin mint address
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; // Token-2022 Program ID
const SPL_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"; // SPL Memo Program ID

// Используем правильную конфигурацию Alchemy

let connection: Connection | undefined;

function getSolanaConnection(): Connection {
  if (!connection) {
    const ALCHEMY_URL = getAlchemyUrl();
    if (!ALCHEMY_URL) {
      console.error("!!!!!!!!!! Alchemy URL не может быть получен! !!!!!!!!!!");
      throw new Error("Alchemy URL configuration is missing.");
    }
    try {
      connection = new Connection(ALCHEMY_URL, "confirmed");
      console.log("[API/Connection] Solana connection established via Alchemy.");
    } catch (e) {
      console.error("[API/Connection] Failed to create Solana connection:", e);
      throw e;
    }
  }
  return connection;
}

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

// --- Новая логика получения транзакций ---

async function getPeCoinUserTokenAccounts(ownerAddress: string): Promise<string[]> {
  const conn = getSolanaConnection();
  try {
    const accounts = await conn.getParsedTokenAccountsByOwner(
      new PublicKey(ownerAddress),
      { mint: new PublicKey(PECOIN_MINT) }, // Ищем по PECOIN_MINT
      // Для Token-2022 нужно указать programId, если мы ищем ТОЛЬКО Token-2022 аккаунты.
      // Если PEcoin может быть и на старом spl-token, то programId лучше не указывать здесь,
      // а фильтровать позже или иметь две отдельные логики.
      // Пока оставляем так, предполагая, что все PEcoin пользователя на Token-2022 или мы хотим все его аккаунты этого минта.
      // Если getParsedTokenAccountsByOwner не требует programId для Token-2022, то можно убрать.
      // Однако, для единообразия с Token-2022, лучше его передавать, если мы точно знаем программу.
      // В данном случае, мы ищем PEcoin, который является Token-2022.
      "confirmed" // Используем "confirmed" как и для соединения
    );
    return accounts.value.map(acc => acc.pubkey.toBase58());
  } catch (error) {
    console.error(`[API/getPeCoinUserTokenAccounts] Error fetching token accounts for ${ownerAddress}:`, error);
    throw error;
  }
}


async function getSignaturesForAddressWithLimit(
  accountAddress: string, 
  limit: number, 
  beforeSignature?: string
): Promise<string[]> {
  const conn = getSolanaConnection();
  try {
    const options: any = { limit };
    if (beforeSignature) {
      options.before = beforeSignature;
    }
    const signaturesInfo = await conn.getSignaturesForAddress(new PublicKey(accountAddress), options);
    return signaturesInfo.map(sigInfo => sigInfo.signature);
  } catch (error) {
    console.error(`[API/getSignaturesForAddressWithLimit] Error fetching signatures for ${accountAddress} (before: ${beforeSignature}):`, error);
    throw error;
  }
}

async function getTransactionWithRetries(
  conn: Connection,
  signature: string,
  retries: number = 3
): Promise<any> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const tx = await conn.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (tx) {
        return tx;
      }
      // Если tx === null, это значит транзакция еще не найдена, это не ошибка, а состояние.
      // Не делаем retry для этого случая сразу, RPC сам ищет. Но если все попытки null, вернем null.
      if (attempt === retries) return null;
    } catch (e: any) {
      lastError = e;
      const isTimeout = e.message?.includes('ETIMEDOUT') || e.message?.includes('timed out');
      
      if (isTimeout && attempt < retries) {
        console.warn(`[API/getTransactionWithRetries] Timeout on attempt ${attempt} for ${signature}. Retrying...`);
        // Экспоненциальная задержка
        await new Promise(res => setTimeout(res, 1000 * attempt)); 
      } else {
        // Если ошибка не таймаут, или попытки кончились - пробрасываем ошибку
        throw e;
      }
    }
  }
  // Если все попытки не увенчались успехом (из-за таймаутов), бросаем последнюю ошибку
  throw lastError;
}

async function getTransactionsBySignatures(signatures: string[]): Promise<any[]> {
  const conn = getSolanaConnection();
  const transactions: any[] = [];
  const promises = signatures.map(signature => 
    getTransactionWithRetries(conn, signature).catch(e => {
      console.error(`[API/getTransactionsBySignatures] Failed to fetch transaction ${signature} after multiple retries:`, e);
      return null; // Возвращаем null в случае неудачи, чтобы Promise.all не прервался
    })
  );

  const results = await Promise.all(promises);

  for (const tx of results) {
    if (tx) {
      transactions.push(tx);
    }
  }
  
  // Контролируемая параллельность вместо последовательного перебора с задержкой
  // Это значительно ускорит процесс, сохраняя при этом контроль над нагрузкой
  // Логика параллельности теперь внутри Promise.all
  return transactions;
}

interface ProcessedPEcoinTransaction {
  signature: string;
  type: "Token"; // В нашем случае всегда "Token" для PEcoin
  action: "sent" | "received" | "other";
  amount: number; // uiAmount
  mint: string;
  date: string;
  sender: string;
  receiver: string;
  tokenName: string; // "PEcoin"
  tokenSymbol: string; // "PE" или что-то подобное
  // Дополнительные поля, если нужны фронтенду
  rawAmount?: string;
  decimals?: number;
  memo?: string; // Комментарий из SPL Memo программы
}

interface TokenBalanceChange {
  mint: string;
  preAmount: bigint;
  postAmount: bigint;
  owner?: string;
  decimals: number;
  address: string;
}

// Эта функция заменяет старую processTransactions
function extractAndFormatPEcoinTransfers(
  rawTransactions: any[],
  userWalletAddress: string, // Адрес кошелька пользователя, для определения sent/received
  userPecoinTokenAccounts: string[] // Список всех PEcoin-аккаунтов пользователя
): ProcessedPEcoinTransaction[] {
  const result: ProcessedPEcoinTransaction[] = [];
  const PECOIN_INFO = { name: "PEcoin", symbol: "PE", decimals: 2 }; // Предполагаемые данные, можно вынести

  for (const tx of rawTransactions) {
    if (!tx || !tx.meta || tx.meta.err) {
      continue;
    }

    // Проверяем структуру транзакции
    if (!tx.transaction || !tx.transaction.message || !tx.transaction.message.accountKeys) {
      console.warn("[API/extractAndFormatPEcoinTransfers] Invalid transaction structure, skipping:", tx.transaction?.signatures?.[0] || "unknown");
      continue;
    }

    const signature = tx.transaction.signatures[0];
    const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "N/A";
    // accountKeys уже являются PublicKey объектами в сырой транзакции
    const accountKeyObjects = tx.transaction.message.accountKeys;
    const accountKeyStrings = accountKeyObjects.map((ak: PublicKey) => ak.toBase58());
    
    // Извлекаем memo из транзакции
    const memo = extractMemoFromTransaction(tx);

    const preBalances = tx.meta.preTokenBalances || [];
    const postBalances = tx.meta.postTokenBalances || [];
    const allAccountChanges = new Map<number, TokenBalanceChange>();

    preBalances.forEach((bal: any) => {
      if (bal.mint === PECOIN_MINT) {
        const address = accountKeyStrings[bal.accountIndex];
        if (!address) return;
        allAccountChanges.set(bal.accountIndex, {
          mint: bal.mint,
          preAmount: BigInt(bal.uiTokenAmount.amount || '0'),
          postAmount: BigInt(bal.uiTokenAmount.amount || '0'),
          owner: bal.owner, // Адрес владельца токен-аккаунта
          decimals: bal.uiTokenAmount.decimals,
          address: address
        });
      }
    });

    postBalances.forEach((bal: any) => {
      if (bal.mint === PECOIN_MINT) {
        const address = accountKeyStrings[bal.accountIndex];
        if (!address) return;
        const existing = allAccountChanges.get(bal.accountIndex);
        if (existing) {
          existing.postAmount = BigInt(bal.uiTokenAmount.amount || '0');
        } else {
          allAccountChanges.set(bal.accountIndex, {
            mint: bal.mint,
            preAmount: BigInt(0),
            postAmount: BigInt(bal.uiTokenAmount.amount || '0'),
            owner: bal.owner,
            decimals: bal.uiTokenAmount.decimals,
            address: address
          });
        }
      }
    });
    
    const pecoinDeltas: Array<{ address: string; owner?: string; deltaRaw: bigint; uiDelta: number; decimals: number;}> = [];
    allAccountChanges.forEach((change: TokenBalanceChange) => {
        const deltaRaw: bigint = change.postAmount - change.preAmount;
        if (deltaRaw !== BigInt(0)) {
            pecoinDeltas.push({
                address: change.address, // Адрес токен-аккаунта
                owner: change.owner,     // Адрес владельца токен-аккаунта
                deltaRaw: deltaRaw,
                uiDelta: Number(deltaRaw) / Math.pow(10, change.decimals),
                decimals: change.decimals,
            });
        }
    });

    if (pecoinDeltas.length === 0) continue;

    // Определяем, является ли эта транзакция "отправкой" или "получением" для userWalletAddress
    // Это сложнее, так как userWalletAddress может быть владельцем нескольких tokenAccounts
    let primaryUserTokenAccountInvolved: string | undefined = undefined;
    let overallUserDeltaRaw = BigInt(0);
    let fixedDecimals = PECOIN_INFO.decimals;

    for (const delta of pecoinDeltas) {
        if (userPecoinTokenAccounts.includes(delta.address)) { // Это один из токен-аккаунтов пользователя
            overallUserDeltaRaw += delta.deltaRaw;
            if (!primaryUserTokenAccountInvolved) primaryUserTokenAccountInvolved = delta.address;
            fixedDecimals = delta.decimals; // Используем реальные decimals из транзакции
        }
    }
    
    if (overallUserDeltaRaw === BigInt(0) && !primaryUserTokenAccountInvolved) {
        // Транзакция не затронула балансы известных PEcoin аккаунтов пользователя
        continue;
    }

    let action: "sent" | "received" | "other" = "other";
    let fromAddress = "Unknown";
    let toAddress = "Unknown";
    let amountRaw = BigInt(0);
    
    if (overallUserDeltaRaw > BigInt(0)) { // Пользователь получил токены (баланс его счетов увеличился)
        action = "received";
        toAddress = userWalletAddress; // Всегда используем адрес владельца, а не токен-аккаунта
        amountRaw = overallUserDeltaRaw;
        // Ищем отправителя - тот, у кого баланс уменьшился на ту же общую сумму
        const potentialSender = pecoinDeltas.find(d => d.deltaRaw === -overallUserDeltaRaw && !userPecoinTokenAccounts.includes(d.address));
        fromAddress = potentialSender ? (potentialSender.owner || potentialSender.address) : "Unknown/Mint";
    } else if (overallUserDeltaRaw < BigInt(0)) { // Пользователь отправил токены
        action = "sent";
        fromAddress = userWalletAddress; // Всегда используем адрес владельца, а не токен-аккаунта
        amountRaw = -overallUserDeltaRaw;
        // Ищем получателя
        const potentialReceiver = pecoinDeltas.find(d => d.deltaRaw === amountRaw && !userPecoinTokenAccounts.includes(d.address));
        toAddress = potentialReceiver ? (potentialReceiver.owner || potentialReceiver.address) : "Unknown/Burn";
    } else {
        // Случай, когда изменения балансов внутри счетов пользователя (например, консолидация)
        // или сложная транзакция без чистого прихода/расхода для пользователя.
        // Можно добавить логику для "internal" или пропустить, если не нужно отображать.
        // Пока пропускаем такие, если не определен primaryUserTokenAccountInvolved
        if (!primaryUserTokenAccountInvolved) continue;

        // Если есть основной затронутый аккаунт пользователя, но общий дельта 0, 
        // попробуем найти другую сторону среди его же аккаунтов или внешних.
        // Это упрощенная логика, может не покрывать все случаи "internal".
        const userDeltaEntry = pecoinDeltas.find(d => d.address === primaryUserTokenAccountInvolved);
        if (userDeltaEntry && userDeltaEntry.deltaRaw !== BigInt(0)) {
            amountRaw = userDeltaEntry.deltaRaw > BigInt(0) ? userDeltaEntry.deltaRaw : -userDeltaEntry.deltaRaw;
             if (userDeltaEntry.deltaRaw > BigInt(0)) { // получил на этот акк
                action = "received"; toAddress = primaryUserTokenAccountInvolved;
                const s = pecoinDeltas.find(d => d.deltaRaw === -amountRaw && d.address !== primaryUserTokenAccountInvolved);
                fromAddress = s ? (s.owner || s.address) : "Unknown/Internal";
             } else { // отправил с этого акка
                action = "sent"; fromAddress = primaryUserTokenAccountInvolved;
                const r = pecoinDeltas.find(d => d.deltaRaw === amountRaw && d.address !== primaryUserTokenAccountInvolved);
                toAddress = r ? (r.owner || r.address) : "Unknown/Internal";
             }
        } else {
            continue; // Не смогли определить перевод
        }
    }
    
    const uiAmount = Number(amountRaw) / Math.pow(10, fixedDecimals);

    // Проверка на дубликат перед добавлением (упрощенная, т.к. одна транзакция может затронуть несколько аккаунтов пользователя)
    // Если мы основываемся на signature, то каждая транзакция будет уникальна в result.
    // Проблема дублирования возникает, если мы проходим по userPecoinTokenAccounts и для каждого создаем запись.
    // Здесь мы обрабатываем транзакцию один раз.
    result.push({
        signature,
        type: "Token",
        action,
        amount: uiAmount,
        mint: PECOIN_MINT,
        date: blockTime,
        sender: fromAddress,
        receiver: toAddress,
        tokenName: PECOIN_INFO.name,
        tokenSymbol: PECOIN_INFO.symbol,
        rawAmount: amountRaw.toString(),
        decimals: fixedDecimals,
        memo: memo, // Добавляем memo к результату
    });
  }
  return result;
}
// --- КОНЕЦ Новой логики ---


// --- Обработчик POST запроса ---
export async function POST(request: Request) {
  let requestBodyText = "";
  try {
    requestBodyText = await request.text();
    // console.log("[API/POST] Received raw request body:", requestBodyText);
    const body = JSON.parse(requestBodyText);
    
    // Ожидаем walletAddress пользователя для получения истории
    const walletAddress = body.walletAddress || body.wallet; // Поддержка старого параметра wallet
    const requestedLimit = body.limit && Number(body.limit) > 0 ? Number(body.limit) : 10; // По умолчанию 10
    const beforeSignature = body.beforeSignature || undefined; // Подпись для пагинации
    
    if (!walletAddress) {
      console.error("[API/POST] Wallet address is missing in request body:", body);
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    // Проверяем инициализацию экосистемы в самом начале (ОТКЛЮЧЕНО для production)
    let participants = dynamicEcosystemCache.getAllParticipants()
    if (participants.length === 0 && process.env.NODE_ENV !== 'production') {
      console.log('[PEcoin History API] 🚀 Экосистема не инициализирована, запускаем инициализацию...')
      try {
        await dynamicEcosystemCache.refreshParticipants()
        participants = dynamicEcosystemCache.getAllParticipants()
        console.log(`[PEcoin History API] ✅ Предзагружено ${participants.length} участников`)
      } catch (error) {
        console.error('[PEcoin History API] ❌ Ошибка предзагрузки участников:', error)
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.log('[PEcoin History API] ⚠️ Инициализация экосистемы отключена для production')
    }

    // Создаем ключ кэша с учетом всех параметров
    const cacheKey = `tx-history:${walletAddress}:limit:${requestedLimit}${beforeSignature ? `:before:${beforeSignature}` : ''}`
    
    // Проверяем кэш
    const cached = serverCache.get(cacheKey)
    if (cached) {
      console.log(`🎯 Transaction Cache HIT: ${walletAddress} (limit: ${requestedLimit})`)
      return NextResponse.json(cached)
    }

    console.log(`🔄 Transaction Cache MISS: ${walletAddress} - fetching from Solana`)

    // console.log(`[API/POST] Запрос истории для wallet: ${walletAddress}`);

    // 1. Получаем все PEcoin-токен аккаунты пользователя
    // Функция getUserTokenAccounts из lib/alchemy/solana.ts может быть использована, если она подходит
    // или используем нашу новую getPeCoinUserTokenAccounts
    const userPecoinTokenAccounts = await getPeCoinUserTokenAccounts(walletAddress);

    if (!userPecoinTokenAccounts.length) {
      // console.log(`[API/POST] No PEcoin token accounts found for wallet ${walletAddress}.`);
      const emptyResult = { transactions: [] }
      
      // Кэшируем пустой результат на меньшее время (30 секунд)
      serverCache.set(cacheKey, emptyResult, 'TRANSACTION_HISTORY_EMPTY')
      
      return NextResponse.json(emptyResult);
    }
    // console.log(`[API/POST] PEcoin token accounts for ${walletAddress}:`, userPecoinTokenAccounts);

    // 2. Получаем подписи транзакций прямо для основного кошелька 
    // Это даст нам больше транзакций чем поиск только по токен-аккаунтам
    const signaturesSet = new Set<string>();
    
    // Запрашиваем подписи для основного кошелька
    const walletSigs = await getSignaturesForAddressWithLimit(walletAddress, requestedLimit * 3, beforeSignature);
    walletSigs.forEach(s => signaturesSet.add(s));
    
    // Дополнительно добавляем подписи из токен-аккаунтов
    for (const tokenAccount of userPecoinTokenAccounts) {
      const sigs = await getSignaturesForAddressWithLimit(tokenAccount, requestedLimit, beforeSignature);
      sigs.forEach(s => signaturesSet.add(s));
    }


    const allUniqueSignatures = Array.from(signaturesSet);
    // console.log(`[API/POST] Total unique signatures to fetch for ${walletAddress} (limit: ${requestedLimit}, before: ${beforeSignature}): ${allUniqueSignatures.length}`);

    if (allUniqueSignatures.length === 0) {
      const emptyResult = { transactions: [] }
      serverCache.set(cacheKey, emptyResult, 'TRANSACTION_HISTORY_EMPTY')
      return NextResponse.json(emptyResult);
    }

    // 3. Получаем детали транзакций по уникальным подписям
    const rawTransactions = await getTransactionsBySignatures(allUniqueSignatures);
    // console.log(`[API/POST] Fetched ${rawTransactions.length} raw transaction details for ${walletAddress}.`);

    // 4. Обрабатываем транзакции и форматируем для ответа
    const processedTransactions = extractAndFormatPEcoinTransfers(rawTransactions, walletAddress, userPecoinTokenAccounts);

    // 5. Сортируем по дате (от новых к старым)
    processedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // 6. Проверяем и обогащаем транзакции именами участников
    // Переиспользуем уже инициализированных участников
    
    const enrichedTransactions = await Promise.all(processedTransactions.map(async tx => {
      const senderInfo = await walletNameResolver.getNameForWallet(tx.sender)
      const receiverInfo = await walletNameResolver.getNameForWallet(tx.receiver)
      
      // ✅ ИСПРАВЛЕНО: Заменены deprecated getDisplayName() на formatAddress()
      const formatAddress = (address: string): string => {
        if (!address || address.length <= 12) return address
        return `${address.slice(0, 4)}...${address.slice(-4)}`
      }
      
      return {
        ...tx,
        senderName: senderInfo ? senderInfo.name : formatAddress(tx.sender),
        receiverName: receiverInfo ? receiverInfo.name : formatAddress(tx.receiver),
        senderInfo,
        receiverInfo
      }
    }))
    
    // Ограничиваем количество возвращаемых транзакций, если нужно
    const finalTransactions = enrichedTransactions.slice(0, requestedLimit);

    console.log(`[PEcoin History API] ✅ Возвращено ${finalTransactions.length} обогащенных транзакций`);

    // Определяем nextBeforeSignature для следующего запроса
    let nextBeforeSignature: string | undefined = undefined;
    if (finalTransactions.length > 0 && finalTransactions.length === requestedLimit && allUniqueSignatures.length >= requestedLimit ) {
      // Если мы получили столько транзакций, сколько запрашивали,
      // и было достаточно подписей для потенциального продолжения,
      // берем подпись последней транзакции в текущем наборе как "курсор" для следующего запроса.
      // Это упрощение, т.к. allUniqueSignatures может содержать подписи "до" beforeSignature из других аккаунтов.
      // Более точный способ - если getSignaturesForAddress возвращает флаг hasMore.
      // Пока что, если вернули полный лимит, предполагаем, что есть еще.
      nextBeforeSignature = finalTransactions[finalTransactions.length - 1].signature;
    }

    const result = { 
      transactions: finalTransactions,
      nextBeforeSignature: nextBeforeSignature 
    }

    // Кэшируем результат
    serverCache.set(cacheKey, result, 'TRANSACTION_HISTORY')

    // console.log(`[API/POST] Returning ${finalTransactions.length} processed PEcoin transactions for ${walletAddress}. Next before: ${nextBeforeSignature}`);
    console.log(`✅ Transaction history cached: ${walletAddress} (${finalTransactions.length} txs)`)
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[API/POST] Error in POST /api/pecoin-history:", error);
    // console.error("[API/POST] Request body that caused error:", requestBodyText); // Для отладки, может содержать чувствительные данные

    let errorMessage = "Failed to fetch transaction history.";
    let errorDetails = error.message || "Unknown error";

    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      errorMessage = "Invalid request format.";
      errorDetails = "Expected JSON body.";
    } else if (error.message.includes("NEXT_PUBLIC_ALCHEMY_API_KEY is not configured")) {
        errorMessage = "Server configuration error.";
        errorDetails = "Alchemy API Key is not configured on the server.";
    }


    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}

// Optional: Add a GET handler or other methods if needed
// export async function GET(request: Request) {
//   return NextResponse.json({ message: "This endpoint expects a POST request with a wallet address." });
// } 