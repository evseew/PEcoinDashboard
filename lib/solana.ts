// Получить metadata токена через Alchemy RPC или Solscan API (MVP)
export async function getTokenMetadata(tokenMint: string): Promise<{ image?: string; uri?: string }> {
  try {
    const solscanRes = await fetch(`https://public-api.solscan.io/token/meta?tokenAddress=${tokenMint}`)
    const solscanData = await solscanRes.json()
    if (solscanData.icon) {
      return { image: solscanData.icon }
    }
  } catch (e) {
    // fallback
  }
  return {}
} 