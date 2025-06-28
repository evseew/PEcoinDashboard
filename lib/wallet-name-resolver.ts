// Резолвинг адресов кошельков в имена участников экосистемы
import { supabase } from '@/lib/supabaseClient'

export interface WalletNameInfo {
  name: string
  type: 'team' | 'startup' | 'staff'
  shortAddress: string
}

interface Participant {
  name: string
  walletAddress: string
  type: 'team' | 'startup' | 'staff'
}

class WalletNameResolver {
  private nameCache = new Map<string, WalletNameInfo | null>()
  private cacheExpiry = new Map<string, number>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 минут
  private participantsCache: Participant[] = []
  private lastParticipantsRefresh = 0
  private readonly PARTICIPANTS_CACHE_TTL = 5 * 60 * 1000 // 5 минут

  /**
   * Очистить кэш
   */
  clearCache() {
    this.nameCache.clear()
    this.cacheExpiry.clear()
    this.participantsCache = []
    this.lastParticipantsRefresh = 0
    console.log(`[WalletNameResolver] 🧹 Кэш очищен`)
  }

  /**
   * ✅ ИСПРАВЛЕНО: Загружаем участников напрямую из Supabase
   */
  private async refreshParticipants(): Promise<Participant[]> {
    const now = Date.now()
    if (this.participantsCache.length > 0 && (now - this.lastParticipantsRefresh) < this.PARTICIPANTS_CACHE_TTL) {
      return this.participantsCache
    }

    try {
      console.log(`[WalletNameResolver] 🔄 Загружаем участников напрямую из Supabase...`)
      
      const [teamsResponse, startupsResponse, staffResponse] = await Promise.all([
        supabase.from('teams').select('name, wallet_address'),
        supabase.from('startups').select('name, wallet_address'),
        supabase.from('staff').select('name, wallet_address')
      ])
      
      const participants: Participant[] = []
      
      // Команды
      if (teamsResponse.data) {
        teamsResponse.data.forEach((team: any) => {
          if (team.wallet_address) {
            participants.push({
              name: team.name,
              walletAddress: team.wallet_address,
              type: 'team'
            })
          }
        })
      }
      
      // Стартапы
      if (startupsResponse.data) {
        startupsResponse.data.forEach((startup: any) => {
          if (startup.wallet_address) {
            participants.push({
              name: startup.name,
              walletAddress: startup.wallet_address,
              type: 'startup'
            })
          }
        })
      }
      
      // Сотрудники
      if (staffResponse.data) {
        staffResponse.data.forEach((staff: any) => {
          if (staff.wallet_address) {
            participants.push({
              name: staff.name,
              walletAddress: staff.wallet_address,
              type: 'staff'
            })
          }
        })
      }
      
      this.participantsCache = participants
      this.lastParticipantsRefresh = now
      
      console.log(`[WalletNameResolver] ✅ Загружено ${participants.length} участников из Supabase`)
      return participants
      
    } catch (error) {
      console.error(`[WalletNameResolver] ❌ Ошибка загрузки участников:`, error)
      return []
    }
  }

  /**
   * Получить имя для адреса кошелька
   */
  async getNameForWallet(walletAddress: string): Promise<WalletNameInfo | null> {
    if (!walletAddress || walletAddress === "Unknown" || walletAddress.includes("Unknown/")) {
      return null
    }

    // Проверяем кэш
    const cached = this.nameCache.get(walletAddress)
    const expiry = this.cacheExpiry.get(walletAddress)
    
    if (cached !== undefined && expiry && expiry > Date.now()) {
      return cached
    }

    // ✅ ИСПРАВЛЕНО: Загружаем участников напрямую из Supabase
    const participants = await this.refreshParticipants()
    
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
   * Получить отображаемое имя (DEPRECATED - используйте async версию)
   */
  getDisplayName(walletAddress: string): string {
    console.log(`[WalletNameResolver] ⚠️ getDisplayName устарел, используйте async getNameForWallet`)
    return this.formatAddress(walletAddress)
  }

  /**
   * Получить отображаемое имя с типом (DEPRECATED - используйте async версию)
   */
  getDisplayNameWithType(walletAddress: string): string {
    console.log(`[WalletNameResolver] ⚠️ getDisplayNameWithType устарел, используйте async getNameForWallet`)
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
      hitRate: total > 0 ? (hits / total * 100).toFixed(1) + '%' : '0%',
      participantsLoaded: this.participantsCache.length > 0
    }
  }
}

// Экспортируем синглтон
export const walletNameResolver = new WalletNameResolver() 