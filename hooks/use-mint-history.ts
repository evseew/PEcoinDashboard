import { useState, useEffect, useCallback } from 'react'

export interface MintOperation {
  id: string
  operationId: string
  type: 'single' | 'batch'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  timestamp: string
  completedAt?: string
  collection: string
  collectionId: string
  
  // Для single операций
  nftName?: string
  recipient?: string
  leafIndex?: number
  transactionHash?: string
  
  // Для batch операций
  totalItems?: number
  processedItems?: number
  successfulItems?: number
  failedItems?: number
  progress?: number
  
  // Общие поля
  timePassed: string
  cost: number
  confirmations: number
  error?: string
}

export interface MintStatistics {
  total: number
  completed: number
  failed: number
  processing: number
  successRate: number
  totalCost: number
  avgCostPerMint: number
  today: {
    total: number
    completed: number
    failed: number
  }
}

interface MintHistoryFilters {
  status?: string
  type?: string
  collectionId?: string
  limit?: number
}

export function useMintHistory(initialFilters: MintHistoryFilters = {}) {
  const [operations, setOperations] = useState<MintOperation[]>([])
  const [statistics, setStatistics] = useState<MintStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<MintHistoryFilters>(initialFilters)

  const fetchHistory = useCallback(async (newFilters?: MintHistoryFilters) => {
    try {
      setLoading(true)
      setError(null)
      
      const activeFilters = newFilters || filters
      const queryParams = new URLSearchParams()
      
      if (activeFilters.status) queryParams.append('status', activeFilters.status)
      if (activeFilters.type) queryParams.append('type', activeFilters.type)
      if (activeFilters.collectionId) queryParams.append('collectionId', activeFilters.collectionId)
      if (activeFilters.limit) queryParams.append('limit', activeFilters.limit.toString())
      
      console.log('[useMintHistory] Загружаем историю с фильтрами:', activeFilters)
      
      const response = await fetch(`/api/mint-history?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Не удалось загрузить историю')
      }
      
      setOperations(data.data.operations || [])
      setStatistics(data.data.statistics || null)
      
      console.log('[useMintHistory] ✅ История загружена:', {
        operationsCount: data.data.operations?.length || 0,
        total: data.data.total || 0
      })
      
    } catch (err: any) {
      console.error('[useMintHistory] Ошибка загрузки:', err)
      setError(err.message || 'Не удалось загрузить историю минтинга')
      setOperations([])
      setStatistics(null)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Обновление фильтров
  const updateFilters = useCallback((newFilters: MintHistoryFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    fetchHistory({ ...filters, ...newFilters })
  }, [filters, fetchHistory])

  // Получение последних операций для дашборда
  const getRecentOperations = useCallback((limit: number = 3) => {
    return operations
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }, [operations])

  // Получение операций по статусу
  const getOperationsByStatus = useCallback((status: string) => {
    return operations.filter(op => op.status === status)
  }, [operations])

  // Получение операций по коллекции
  const getOperationsByCollection = useCallback((collectionId: string) => {
    return operations.filter(op => op.collectionId === collectionId)
  }, [operations])

  // Real-time обновления (каждые 30 секунд для processing операций)
  useEffect(() => {
    const hasProcessingOperations = operations.some(op => op.status === 'processing')
    
    if (!hasProcessingOperations) return
    
    const interval = setInterval(() => {
      console.log('[useMintHistory] Обновляем статус processing операций')
      fetchHistory()
    }, 30000) // 30 секунд
    
    return () => clearInterval(interval)
  }, [operations, fetchHistory])

  // Первоначальная загрузка
  useEffect(() => {
    fetchHistory()
  }, []) // Убираем fetchHistory из зависимостей для предотвращения циклических вызовов

  // Принудительное обновление
  const refresh = useCallback(() => {
    fetchHistory()
  }, [fetchHistory])

  // Очистка фильтров
  const clearFilters = useCallback(() => {
    const clearedFilters = { limit: filters.limit }
    setFilters(clearedFilters)
    fetchHistory(clearedFilters)
  }, [filters.limit, fetchHistory])

  return {
    // Данные
    operations,
    statistics,
    loading,
    error,
    filters,
    
    // Методы
    updateFilters,
    refresh,
    clearFilters,
    
    // Вспомогательные функции
    getRecentOperations,
    getOperationsByStatus,
    getOperationsByCollection,
    
    // Вычисляемые значения
    hasData: operations.length > 0,
    isEmpty: !loading && operations.length === 0,
    hasProcessingOperations: operations.some(op => op.status === 'processing')
  }
} 