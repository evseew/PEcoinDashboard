import { useState, useEffect, useCallback } from 'react'

export interface NFTCollection {
  id: string
  name: string
  description: string
  symbol: string
  tree_address: string
  collection_address?: string
  creator_address?: string
  capacity: number
  minted: number
  depth?: number
  buffer_size?: number
  image_url?: string
  external_url?: string
  metadata_json?: any
  has_valid_tree: boolean
  supports_das: boolean
  rpc_used?: string
  status: 'active' | 'paused' | 'completed'
  is_public: boolean
  allow_minting: boolean
  created_at: string
  updated_at: string
  imported_at: string
  last_sync_at?: string
}

export function useNFTCollections() {
  const [collections, setCollections] = useState<NFTCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCollections = useCallback(async () => {
    try {
      console.log('[useNFTCollections] Загружаем коллекции...')
      
      const response = await fetch('/api/nft-collection')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Не удалось загрузить коллекции')
      }
      
      setCollections(data.collections || [])
      setError(null)
      console.log(`[useNFTCollections] Загружено ${data.collections?.length || 0} коллекций`)
      
    } catch (err: any) {
      console.error('[useNFTCollections] Ошибка:', err)
      setError(err.message || 'Не удалось загрузить коллекции')
      setCollections([])
    }
  }, [])

  const refreshCollection = useCallback(async (treeAddress: string) => {
    try {
      console.log(`[useNFTCollections] Обновляем коллекцию ${treeAddress}`)
      
      // Получаем свежие данные из блокчейна
      const fetchResponse = await fetch('/api/nft-collection/fetch-tree-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treeAddress })
      })
      
      if (!fetchResponse.ok) {
        throw new Error('Не удалось получить данные из блокчейна')
      }
      
      const fetchData = await fetchResponse.json()
      
      if (!fetchData.success) {
        throw new Error(fetchData.error || 'Ошибка получения данных')
      }
      
      // Находим коллекцию для обновления
      const collection = collections.find(c => c.tree_address === treeAddress)
      if (!collection) {
        throw new Error('Коллекция не найдена')
      }
      
      // Обновляем коллекцию в базе данных
      const updateResponse = await fetch('/api/nft-collection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: collection.id,
          minted: fetchData.collection.minted,
          capacity: fetchData.collection.capacity,
          has_valid_tree: fetchData.collection.hasValidTree,
          supports_das: fetchData.collection.supportsDAS,
          rpc_used: fetchData.collection.rpcUsed,
          last_sync_at: new Date().toISOString()
        })
      })
      
      if (!updateResponse.ok) {
        throw new Error('Не удалось обновить коллекцию в базе')
      }
      
      // Обновляем локальные данные
      await fetchCollections()
      
      return { success: true }
      
    } catch (err: any) {
      console.error('[useNFTCollections] Ошибка обновления:', err)
      throw err
    }
  }, [collections, fetchCollections])

  const deleteCollection = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/nft-collection?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Не удалось удалить коллекцию')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Ошибка удаления')
      }
      
      // Обновляем локальные данные
      await fetchCollections()
      
      return { success: true, message: data.message }
      
    } catch (err: any) {
      console.error('[useNFTCollections] Ошибка удаления:', err)
      throw err
    }
  }, [fetchCollections])

  // Загрузка при первом рендере
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await fetchCollections()
      setLoading(false)
    }
    
    loadInitialData()
  }, [fetchCollections])

  // Вспомогательные функции
  const getActiveCollections = useCallback(() => {
    return collections.filter(c => c.status === 'active' && c.has_valid_tree)
  }, [collections])

  const getCollectionById = useCallback((id: string) => {
    return collections.find(c => c.id === id)
  }, [collections])

  const getCollectionByTreeAddress = useCallback((treeAddress: string) => {
    return collections.find(c => c.tree_address === treeAddress)
  }, [collections])

  const getTotalStats = useCallback(() => {
    const totalCapacity = collections.reduce((sum, c) => sum + c.capacity, 0)
    const totalMinted = collections.reduce((sum, c) => sum + c.minted, 0)
    const activeCollections = collections.filter(c => c.status === 'active').length
    
    return {
      totalCapacity,
      totalMinted,
      activeCollections,
      totalCollections: collections.length,
      utilizationPercentage: totalCapacity > 0 ? Math.round((totalMinted / totalCapacity) * 100) : 0
    }
  }, [collections])

  return {
    // Данные
    collections,
    loading,
    error,
    
    // Методы
    fetchCollections,
    refreshCollection,
    deleteCollection,
    
    // Вспомогательные функции
    getActiveCollections,
    getCollectionById,
    getCollectionByTreeAddress,
    getTotalStats
  }
} 