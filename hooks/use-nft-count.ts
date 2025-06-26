import { useState, useEffect } from 'react'

interface UseNftCountResult {
  nftCount: number | null
  loading: boolean
  error: string | null
}

// Кеш для NFT счетчиков
const nftCountCache = new Map<string, { count: number; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 минут

export function useNftCount(walletAddress: string | null): UseNftCountResult {
  const [nftCount, setNftCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!walletAddress) {
      setNftCount(null)
      return
    }

    // Проверяем кеш
    const cached = nftCountCache.get(walletAddress)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setNftCount(cached.count)
      return
    }

    const fetchNftCount = async () => {
      setLoading(true)
      setError(null)
      
      try {
        console.log('[useNftCount] Запрос NFT count для кошелька:', walletAddress)
        
        const response = await fetch('/api/nft-collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        })

        console.log('[useNftCount] Ответ сервера:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

        if (response.ok) {
          const data = await response.json()
          console.log('[useNftCount] Данные получены:', data)
          
          const count = data.count || 0
          
          // Кешируем результат
          nftCountCache.set(walletAddress, { count, timestamp: Date.now() })
          setNftCount(count)
        } else {
          const errorText = await response.text()
          console.error('[useNftCount] Ошибка HTTP:', response.status, errorText)
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
      } catch (err) {
        console.error('[useNftCount] Ошибка при получении NFT count:', err)
        
        // Более детальная информация об ошибке
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          console.error('[useNftCount] Ошибка сети - возможно сервер не запущен или проблемы с CORS')
          setError('Ошибка соединения с сервером')
        } else {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить NFT')
        }
        
        setNftCount(0) // Показываем 0 при ошибке
      } finally {
        setLoading(false)
      }
    }

    fetchNftCount()
  }, [walletAddress])

  return { nftCount, loading, error }
} 