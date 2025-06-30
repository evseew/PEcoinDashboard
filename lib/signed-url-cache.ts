// Утилита для кэширования signed URLs из Supabase Storage
import { supabase } from '@/lib/supabaseClient'

interface CachedUrl {
  url: string | null
  timestamp: number
}

class SignedUrlCache {
  private cache = new Map<string, CachedUrl>()
  private readonly TTL = 6 * 60 * 60 * 1000 // 6 часов (меньше времени жизни signed URL)
  private readonly bucketName = "dashboard.logos"
  private readonly urlExpiry = 60 * 60 * 24 * 7 // 7 дней для signed URL

  /**
   * Получить signed URL с кэшированием
   */
  async getSignedUrl(storageKey: string | null): Promise<string | null> {
    if (!storageKey) return null
    
    // Если это уже полный URL (начинается с http), возвращаем как есть
    if (storageKey.startsWith("http")) {
      return storageKey
    }
    
    // Проверяем кэш
    const cached = this.cache.get(storageKey)
    if (cached && this.isValidCacheEntry(cached)) {
      return cached.url
    }
    
    // Получаем новый signed URL
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(storageKey, this.urlExpiry)
      
      if (error) {
        console.error(`Ошибка получения signed URL для ${storageKey}:`, error)
        this.cacheResult(storageKey, null)
        return null
      }
      
      const url = data?.signedUrl || null
      this.cacheResult(storageKey, url)
      
      return url
    } catch (error) {
      console.error(`Критическая ошибка получения signed URL для ${storageKey}:`, error)
      this.cacheResult(storageKey, null)
      return null
    }
  }

  /**
   * Получить массив signed URLs параллельно
   */
  async getSignedUrls(storageKeys: (string | null)[]): Promise<(string | null)[]> {
    return Promise.all(
      storageKeys.map(key => this.getSignedUrl(key))
    )
  }

  /**
   * Проверить валидность записи в кэше
   */
  private isValidCacheEntry(cached: CachedUrl): boolean {
    return (Date.now() - cached.timestamp) < this.TTL
  }

  /**
   * Сохранить результат в кэше
   */
  private cacheResult(storageKey: string, url: string | null): void {
    this.cache.set(storageKey, {
      url,
      timestamp: Date.now()
    })
    
    // Ограничиваем размер кэша (максимум 500 записей)
    if (this.cache.size > 500) {
      this.cleanupOldEntries()
    }
  }

  /**
   * Очистить старые записи из кэша
   */
  private cleanupOldEntries(): void {
    const now = Date.now()
    const entriesToDelete: string[] = []
    
    for (const [key, cached] of this.cache.entries()) {
      if (!this.isValidCacheEntry(cached)) {
        entriesToDelete.push(key)
      }
    }
    
    // Удаляем просроченные записи
    entriesToDelete.forEach(key => this.cache.delete(key))
    
    // Если все еще слишком много записей, удаляем самые старые
    if (this.cache.size > 500) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toDelete = sortedEntries.slice(0, 100)
      toDelete.forEach(([key]) => this.cache.delete(key))
    }
  }

  /**
   * Получить статистику кэша
   */
  getStats(): {
    totalEntries: number
    validEntries: number
    expiredEntries: number
    cacheHitRate: number
  } {
    const now = Date.now()
    let valid = 0
    let expired = 0
    
    for (const cached of this.cache.values()) {
      if (this.isValidCacheEntry(cached)) {
        valid++
      } else {
        expired++
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries: valid,
      expiredEntries: expired,
      cacheHitRate: this.cache.size > 0 ? (valid / this.cache.size) * 100 : 0
    }
  }

  /**
   * Инвалидировать конкретный ключ из кэша
   */
  invalidate(storageKey: string): void {
    this.cache.delete(storageKey)
    console.log(`[SignedUrlCache] 🗑️ Инвалидирован ключ: ${storageKey}`)
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear()
  }
}

// Экспортируем синглтон
export const signedUrlCache = new SignedUrlCache() 