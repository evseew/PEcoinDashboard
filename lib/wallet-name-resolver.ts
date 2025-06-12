// Резолвинг адресов кошельков в имена участников экосистемы
import { dynamicEcosystemCache } from './dynamic-ecosystem-cache'

export interface WalletNameInfo {
  name: string
  type: 'team' | 'startup' | 'staff'
  shortAddress: string
}

class WalletNameResolver {
  private nameCache = new Map<string, WalletNameInfo | null>()
  private cacheExpiry = new Map<string, number>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 минут

  /**
   * Очистить кэш
   */
  clearCache() {
    this.nameCache.clear()
    this.cacheExpiry.clear()
    console.log(`[WalletNameResolver] 🧹 Кэш очищен`)
  }

  /**
   * Получить имя для адреса кошелька
   */
  getNameForWallet(walletAddress: string): WalletNameInfo | null {
    if (!walletAddress || walletAddress === "Unknown" || walletAddress.includes("Unknown/")) {
      return null
    }

    // Проверяем кэш
    const cached = this.nameCache.get(walletAddress)
    const expiry = this.cacheExpiry.get(walletAddress)
    
    if (cached !== undefined && expiry && expiry > Date.now()) {
      return cached
    }

    // Ищем в экосистеме
    const participants = dynamicEcosystemCache.getAllParticipants()
    
    // Если экосистема пуста, не кэшируем результат
    if (participants.length === 0) {
      console.log(`[WalletNameResolver] ⚠️ Экосистема пуста, пропускаем кэширование для ${walletAddress.slice(0, 8)}...`)
      return null
    }

    // Ищем участника
    const participant = participants.find(p => p.walletAddress === walletAddress)
    
    let result: WalletNameInfo | null = null
    if (participant) {
      result = {
        name: participant.name,
        type: participant.type as 'team' | 'startup' | 'staff',
        shortAddress: this.formatAddress(walletAddress)
      }
      console.log(`[WalletNameResolver] ✅ Найден: ${walletAddress.slice(0, 8)}... -> ${participant.name} (${participant.type})`)
    } else {
      console.log(`[WalletNameResolver] ❌ Не найден: ${walletAddress.slice(0, 8)}...`)
    }

    // Кэшируем результат
    this.nameCache.set(walletAddress, result)
    this.cacheExpiry.set(walletAddress, Date.now() + this.CACHE_DURATION)

    return result
  }

  /**
   * Получить отображаемое имя
   */
  getDisplayName(walletAddress: string): string {
    const info = this.getNameForWallet(walletAddress)
    return info ? info.name : this.formatAddress(walletAddress)
  }

  /**
   * Получить отображаемое имя с типом
   */
  getDisplayNameWithType(walletAddress: string): string {
    const info = this.getNameForWallet(walletAddress)
    if (info) {
      const typeEmoji = info.type === 'team' ? '👥' : info.type === 'startup' ? '🚀' : '👨‍💼'
      return `${typeEmoji} ${info.name}`
    }
    return this.formatAddress(walletAddress)
  }

  /**
   * Форматировать адрес
   */
  private formatAddress(address: string): string {
    if (!address || address.length <= 12) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  /**
   * Получить статистику кэша
   */
  getCacheStats() {
    const total = this.nameCache.size
    const hits = Array.from(this.nameCache.values()).filter(v => v !== null).length
    const misses = total - hits
    
    return {
      total,
      hits,
      misses,
      hitRate: total > 0 ? (hits / total * 100).toFixed(1) + '%' : '0%'
    }
  }
}

// Экспортируем синглтон
export const walletNameResolver = new WalletNameResolver() 