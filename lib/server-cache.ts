// Централизованная система кэширования для API endpoints
// Избегает дублирования запросов при высокой нагрузке

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
}

class ServerCache {
  private cache = new Map<string, CacheItem<any>>()
  private pendingRequests = new Map<string, Promise<any>>()

  // Время жизни для разных типов данных (в миллисекундах)
  private readonly TTL_CONFIG = {
    NFT_COLLECTION: 10 * 60 * 1000,    // 10 минут - NFT меняются редко
    TOKEN_BALANCE: 2 * 60 * 1000,      // 2 минуты - балансы меняются чаще
    NFT_METADATA: 30 * 60 * 1000,      // 30 минут - метаданные неизменны
    WALLET_INFO: 5 * 60 * 1000,        // 5 минут - общая информация кошелька
    TRANSACTION_HISTORY: 2 * 60 * 1000, // 2 минуты - история транзакций 
    TRANSACTION_HISTORY_EMPTY: 30 * 1000, // 30 секунд - пустая история (кошелек без транзакций)
    NFT_TRANSACTIONS: 1 * 60 * 1000,   // 1 минута - NFT транзакции
  }

  /**
   * Получить данные из кэша (только чтение, без запроса)
   */
  get(key: string): any | null {
    const now = Date.now()
    const cached = this.cache.get(key)
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      // Обновляем статистику доступа
      cached.accessCount++
      cached.lastAccess = now
      return cached.data
    }
    
    return null
  }

  /**
   * Сохранить данные в кэш напрямую
   */
  set<T>(
    key: string, 
    data: T, 
    cacheType: keyof typeof this.TTL_CONFIG = 'NFT_COLLECTION'
  ): void {
    const ttl = this.TTL_CONFIG[cacheType]
    const now = Date.now()
    
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccess: now
    })
  }

  /**
   * Получить данные из кэша или выполнить запрос
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheType: keyof typeof this.TTL_CONFIG = 'NFT_COLLECTION'
  ): Promise<T> {
    const now = Date.now()
    const ttl = this.TTL_CONFIG[cacheType]
    
    // Проверяем кэш
    const cached = this.cache.get(key)
    if (cached && (now - cached.timestamp) < cached.ttl) {
      // Обновляем статистику доступа
      cached.accessCount++
      cached.lastAccess = now
      console.log(`🎯 Cache HIT: ${key} (${cached.accessCount} accesses)`)
      return cached.data
    }

    // Проверяем, нет ли уже выполняющегося запроса
    const pending = this.pendingRequests.get(key)
    if (pending) {
      console.log(`⏳ Waiting for pending request: ${key}`)
      return await pending
    }

    // Выполняем новый запрос
    console.log(`🔄 Cache MISS: ${key} - fetching new data`)
    const fetchPromise = this.executeFetch(key, fetcher, ttl)
    this.pendingRequests.set(key, fetchPromise)

    try {
      const result = await fetchPromise
      return result
    } finally {
      this.pendingRequests.delete(key)
    }
  }

  /**
   * Выполнить запрос и сохранить в кэш
   */
  private async executeFetch<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    try {
      const data = await fetcher()
      
      // Сохраняем в кэш
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 1,
        lastAccess: Date.now()
      })

      return data
    } catch (error) {
      console.error(`❌ Error fetching data for key ${key}:`, error)
      throw error
    }
  }

  /**
   * Принудительно удалить из кэша
   */
  invalidate(keyPattern: string): number {
    let removed = 0
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key)
        removed++
      }
    }
    console.log(`🗑️ Invalidated ${removed} cache entries matching: ${keyPattern}`)
    return removed
  }

  /**
   * Очистить устаревшие записи
   */
  cleanup(): number {
    const now = Date.now()
    let removed = 0
    
    for (const [key, item] of this.cache.entries()) {
      if ((now - item.timestamp) > item.ttl) {
        this.cache.delete(key)
        removed++
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} expired cache entries`)
    }
    return removed
  }

  /**
   * Получить статистику кэша
   */
  getStats() {
    const now = Date.now()
    const items = Array.from(this.cache.values())
    
    return {
      totalItems: items.length,
      totalAccesses: items.reduce((sum, item) => sum + item.accessCount, 0),
      avgAge: items.length > 0 
        ? Math.round(items.reduce((sum, item) => sum + (now - item.timestamp), 0) / items.length / 1000) 
        : 0,
      pendingRequests: this.pendingRequests.size
    }
  }

  /**
   * Создать ключ для кэша на основе параметров
   */
  static createKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    return `${prefix}:${sortedParams}`
  }
}

// Создаем глобальный экземпляр кэша
const serverCache = new ServerCache()

// Запускаем периодическую очистку каждые 5 минут
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    serverCache.cleanup()
  }, 5 * 60 * 1000)
}

export { serverCache, ServerCache } 