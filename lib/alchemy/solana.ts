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
 * Получить баланс SPL-токена для owner и mint через Alchemy RPC
 */
export async function getSplTokenBalance({
  owner,
  mint,
  apiKey
}: {
  owner: string;
  mint: string;
  apiKey?: string;
}): Promise<number | null> {
  const key = apiKey ? (apiKey.startsWith("https://") ? apiKey.split("/").pop() : apiKey) : getAlchemyKey();
  if (!key) return null;
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
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (
      data.result &&
      data.result.value &&
      data.result.value.length > 0
    ) {
      // Суммируем балансы по всем токен-аккаунтам
      const sum = data.result.value.reduce((acc: number, tokenAccount: any) => {
        const amount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
        return acc + amount;
      }, 0);
      return sum;
    }
    return 0;
  } catch (e) {
    return null;
  }
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
      body: JSON.stringify(body)
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