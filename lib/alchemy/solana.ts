// Получение метаданных токена Solana через Alchemy RPC с кэшированием
// https://docs.alchemy.com/reference/gettokenmetadata

const ALCHEMY_API_KEY = getAlchemyKey();
const ALCHEMY_URL = getAlchemyUrl();

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
  const env = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";
  if (env.startsWith("https://")) return env;
  return "https://solana-mainnet.g.alchemy.com/v2/" + env;
}

export async function getTokenMetadata(tokenMint: string): Promise<{ image?: string; uri?: string }> {
  const now = Date.now()
  const cached = tokenMetaCache.get(tokenMint)
  if (cached && now - cached.ts < CACHE_TTL) {
    return { image: cached.image, uri: cached.uri }
  }

  // Alchemy RPC
  if (ALCHEMY_API_KEY) {
    try {
      const res = await fetch(ALCHEMY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenMetadata",
          params: [tokenMint],
        }),
        signal: AbortSignal.timeout(5000) // 5 секунд timeout
      })
      const data = await res.json()
      if (data.result && data.result.logo) {
        tokenMetaCache.set(tokenMint, { image: data.result.logo, uri: data.result.uri, ts: now })
        return { image: data.result.logo, uri: data.result.uri }
      }
    } catch (e) {
      // fallback
    }
  }

  // Solscan fallback
  try {
    const solscanRes = await fetch(`https://public-api.solscan.io/token/meta?tokenAddress=${tokenMint}`)
    const solscanData = await solscanRes.json()
    if (solscanData.icon) {
      tokenMetaCache.set(tokenMint, { image: solscanData.icon, ts: now })
      return { image: solscanData.icon }
    }
  } catch (e) {
    // fallback
  }
  return {}
}

/**
 * Получить баланс SPL токена для кошелька
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
      console.log(`[Alchemy] 🔄 Попытка ${attempt}/${MAX_RETRIES} для ${owner.slice(0,8)}...`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 секунд timeout
      
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
      
      // Пауза перед повторной попыткой
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  // Этот код никогда не должен выполниться, но для TypeScript
  throw lastError || new Error('Unknown error')
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