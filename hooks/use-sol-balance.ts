import { useState, useEffect } from 'react'

// Для демонстрации используем фиксированный адрес кошелька
// В продакшене это должно браться из конфигурации или переменных окружения
const MINTING_WALLET_ADDRESS = process.env.NEXT_PUBLIC_MINTING_WALLET || '7xKXrW9mF2H8L3nN5d6aPqM1J4zR8vT9G2B5k7N3sQwE'

interface SolBalanceState {
  balance: number | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useSolBalance() {
  const [state, setState] = useState<SolBalanceState>({
    balance: null,
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  const fetchBalance = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Используем публичный RPC endpoint Solana для получения баланса
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [MINTING_WALLET_ADDRESS]
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      // Конвертируем лампоры в SOL (1 SOL = 1e9 lamports)
      const balanceInSol = data.result.value / 1e9

      setState({
        balance: balanceInSol,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Balance fetch error'
      }))
    }
  }

  useEffect(() => {
    fetchBalance()

    // Обновляем баланс каждые 30 секунд
    const interval = setInterval(fetchBalance, 30000)

    return () => clearInterval(interval)
  }, [])

  return {
    ...state,
    refetch: fetchBalance
  }
} 