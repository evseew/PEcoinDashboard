import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'

// Адрес кошелька для минтинга NFT из переменных окружения
const MINTING_WALLET_ADDRESS = process.env.NEXT_PUBLIC_MINTING_WALLET || '5JbDcHSKkPnptsGKS7oZjir2FuALJURf5p9fqAPt4Z6t'

interface SolBalanceState {
  balance: number | null
  isLoading: boolean
  error: string | null
}

export function useSolBalance() {
  const { isAdmin } = useAuth()
  const [state, setState] = useState<SolBalanceState>({
    balance: null,
    isLoading: true,
    error: null
  })

  const fetchBalance = async () => {
    // ✅ ИСПРАВЛЕНО: Не загружаем баланс для неавторизованных пользователей
    if (!isAdmin) {
      setState({
        balance: null,
        isLoading: false,
        error: 'Admin access required'
      })
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch('/api/solana-balance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'API request failed')
      }

      const balanceInSol = data.data.balance

      setState({
        balance: balanceInSol,
        isLoading: false,
        error: null
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
    // ✅ ИСПРАВЛЕНО: Загружаем баланс только для админов
    if (isAdmin) {
      fetchBalance()
    } else {
      setState({
        balance: null,
        isLoading: false,
        error: null
      })
    }
    // Добавляем isAdmin в зависимости, чтобы перезапустить эффект при изменении статуса
  }, [isAdmin])

  return {
    ...state,
    refetch: fetchBalance
  }
} 