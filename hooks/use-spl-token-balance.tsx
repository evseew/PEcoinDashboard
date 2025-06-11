import { useEffect, useState, useRef } from "react"

export function useSplTokenBalance(owner: string, mint: string, apiKey?: string) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!owner || !mint) {
      return
    }
    
    // Очищаем предыдущий таймер
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Debounce запросы на 500ms для уменьшения нагрузки
    timeoutRef.current = setTimeout(() => {
      setLoading(true)
      setError(null)
      
      // Используем прямой API без сложного кэширования
      fetch('/api/token-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          wallets: [owner], 
          mint: mint 
        }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          const balance = data.balances?.[owner] || 0
          setBalance(balance)
        })
        .catch((err) => {
          setError(err.message || 'Ошибка загрузки баланса')
          setBalance(0) // Устанавливаем 0 при ошибке
        })
        .finally(() => {
          setLoading(false)
        })
    }, 500)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [owner, mint, apiKey])

  return { balance, loading, error }
} 