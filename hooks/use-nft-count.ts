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
        const response = await fetch('/api/nft-collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        })

        if (response.ok) {
          const data = await response.json()
          const count = data.count || 0
          
          // Кешируем результат
          nftCountCache.set(walletAddress, { count, timestamp: Date.now() })
          setNftCount(count)
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (err) {
        console.error('Error fetching NFT count:', err)
        setError('Не удалось загрузить NFT')
        setNftCount(0) // Показываем 0 при ошибке
      } finally {
        setLoading(false)
      }
    }

    fetchNftCount()
  }, [walletAddress])

  return { nftCount, loading, error }
} 