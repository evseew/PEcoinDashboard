import { useEffect, useState } from "react"
import { getSplTokenBalance } from "@/lib/alchemy/solana"

export function useSplTokenBalance(owner: string, mint: string, apiKey?: string) {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!owner || !mint) return
    getSplTokenBalance({ owner, mint, apiKey }).then(setBalance)
  }, [owner, mint, apiKey])

  return balance
} 