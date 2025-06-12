// Резолвинг адресов кошельков в имена участников экосистемы
import { dynamicEcosystemCache } from './dynamic-ecosystem-cache'

interface WalletNameInfo {
  name: string
  type: 'team' | 'startup' | 'staff'
  shortAddress: string
}

class WalletNameResolver {
  private nameCache = new Map<string, WalletNameInfo | null>()
  private cacheExpiry = new Map<string, number>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 минут

  /**
   * Получить имя для адреса кошелька
   */
  getNameForWallet(walletAddress: string): WalletNameInfo | null {
    if (!walletAddress || walletAddress === "Unknown" || walletAddress.includes("Unknown/")) {
      return null
    }

    // Логируем попытку резолвинга
    console.log(`[WalletNameResolver] Попытка резолвинга: ${walletAddress}`)

    // Проверяем кэш
    const cached = this.nameCache.get(walletAddress)
    const expiry = this.cacheExpiry.get(walletAddress)
    
    if (cached !== undefined && expiry && expiry > Date.now()) {
      console.log(`[WalletNameResolver] Найдено в кэше: ${walletAddress} -> ${cached?.name || 'null'}`)
      return cached
    }

    // Ищем в экосистеме
    const participants = dynamicEcosystemCache.getAllParticipants()
    console.log(`[WalletNameResolver] Всего участников в экосистеме: ${participants.length}`)
    
    // Логируем всех участников для отладки
    participants.forEach(p => {
      console.log(`[WalletNameResolver] Участник: ${p.name} (${p.type}) - ${p.walletAddress}`)
    })
    
    const participant = participants.find(p => p.walletAddress === walletAddress)
    
    let result: WalletNameInfo | null = null
    
    if (participant) {
      result = {
        name: participant.name,
        type: participant.type,
        shortAddress: this.formatAddress(walletAddress)
      }
      console.log(`[WalletNameResolver] ✅ Найден участник: ${participant.name} (${participant.type})`)
    } else {
      console.log(`[WalletNameResolver] ❌ Участник не найден для: ${walletAddress}`)
    }

    // Кэшируем результат
    this.nameCache.set(walletAddress, result)
    this.cacheExpiry.set(walletAddress, Date.now() + this.CACHE_TTL)
    
    return result
  }

  /**
   * Получить отображаемое имя (имя или сокращенный адрес)
   */
  getDisplayName(walletAddress: string): string {
    const nameInfo = this.getNameForWallet(walletAddress)
    
    if (nameInfo) {
      return nameInfo.name
    }
    
    return this.formatAddress(walletAddress)
  }

  /**
   * Получить отображаемое имя с типом (например: "Team Alpha (Team)")
   */
  getDisplayNameWithType(walletAddress: string): string {
    const nameInfo = this.getNameForWallet(walletAddress)
    
    if (nameInfo) {
      const typeLabel = nameInfo.type === 'team' ? 'Команда' : 
                       nameInfo.type === 'startup' ? 'Стартап' : 'Сотрудник'
      return `${nameInfo.name} (${typeLabel})`
    }
    
    return this.formatAddress(walletAddress)
  }

  /**
   * Форматировать адрес (сокращение)
   */
  private formatAddress(address: string): string {
    if (!address || address === "Unknown" || address.includes("Unknown/")) {
      return address
    }
    
    if (address.length > 12) {
      return `${address.slice(0, 4)}...${address.slice(-4)}`
    }
    
    return address
  }

  /**
   * Обогатить массив транзакций именами
   */
  enrichTransactionsWithNames(transactions: any[]): any[] {
    console.log(`[WalletNameResolver] Обогащение ${transactions.length} транзакций именами`)
    
    return transactions.map(tx => {
      console.log(`[WalletNameResolver] Обрабатываю транзакцию: ${tx.sender} -> ${tx.receiver}`)
      
      const enriched = {
        ...tx,
        senderName: this.getDisplayName(tx.sender),
        receiverName: this.getDisplayName(tx.receiver),
        senderInfo: this.getNameForWallet(tx.sender),
        receiverInfo: this.getNameForWallet(tx.receiver)
      }
      
      console.log(`[WalletNameResolver] Результат: ${enriched.senderName} -> ${enriched.receiverName}`)
      return enriched
    })
  }

  /**
   * Очистить кэш
   */
  clearCache(): void {
    this.nameCache.clear()
    this.cacheExpiry.clear()
  }

  /**
   * Получить статистику кэша
   */
  getCacheStats(): { size: number; hitRate: string } {
    return {
      size: this.nameCache.size,
      hitRate: `${Math.round((this.nameCache.size / Math.max(1, this.nameCache.size + this.cacheExpiry.size)) * 100)}%`
    }
  }
}

// Экспортируем синглтон
export const walletNameResolver = new WalletNameResolver() 