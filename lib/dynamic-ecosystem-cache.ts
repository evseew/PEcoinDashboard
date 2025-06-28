// Динамическое глобальное кэширование для экосистемы PEcoin
// Автоматически получает участников из основной системы entities

import { serverCache } from './server-cache'
import { getBaseUrl } from './get-base-url'

interface DynamicParticipant {
  walletAddress: string
  type: 'team' | 'startup' | 'staff'
  name: string
  id: string
}

interface EcosystemData {
  participants: DynamicParticipant[]
  balances: Map<string, number>
  nfts: Map<string, any[]>
  transactions: Map<string, any[]>
  lastUpdate: number
  lastParticipantsRefresh: number
}

class DynamicEcosystemCache {
  private ecosystemData: EcosystemData = {
    participants: [],
    balances: new Map(),
    nfts: new Map(),
    transactions: new Map(),
    lastUpdate: 0,
    lastParticipantsRefresh: 0
  }
  
  private readonly GLOBAL_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 минут (было 5) - снижаем нагрузку на API
  private readonly PARTICIPANTS_REFRESH_INTERVAL = 30 * 60 * 1000 // 30 минут (участники меняются реже)
  private readonly PECOIN_MINT = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  private refreshTimer?: NodeJS.Timeout
  private participantsTimer?: NodeJS.Timeout

  /**
   * Автоматическая инициализация экосистемы (ПОЛНОСТЬЮ ОТКЛЮЧЕНО)
   */
  async autoInitialize(): Promise<void> {
    // ✅ ПОЛНОСТЬЮ ОТКЛЮЧЕНО для предотвращения дублирования запросов с PublicDashboard
    console.log('⚠️ DynamicEcosystemCache полностью отключен для предотвращения дублирования запросов')
    console.log('💡 Данные загружаются через PublicDashboard и AdminDashboard')
    return
  }

  /**
   * Получение актуального списка участников напрямую из базы данных
   */
  async refreshParticipants(): Promise<void> {
    console.log(`🔄 Обновление списка участников...`)
    
    try {
      const participants: DynamicParticipant[] = []
      
      // Импортируем Supabase клиент
      const { supabase } = await import('@/lib/supabaseClient')
      
      // Получаем команды напрямую из БД
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, wallet_address')
        .not('wallet_address', 'is', null)
      
      if (teams) {
        teams.forEach((team: any) => {
          participants.push({
            walletAddress: team.wallet_address,
            type: 'team',
            name: team.name || `Team ${team.id}`,
            id: team.id
          })
        })
      }
      
      // Получаем стартапы напрямую из БД
      const { data: startups } = await supabase
        .from('startups')
        .select('id, name, wallet_address')
        .not('wallet_address', 'is', null)
      
      if (startups) {
        startups.forEach((startup: any) => {
          participants.push({
            walletAddress: startup.wallet_address,
            type: 'startup',
            name: startup.name || `Startup ${startup.id}`,
            id: startup.id
          })
        })
      }
      
      // Получаем сотрудников напрямую из БД
      const { data: staff } = await supabase
        .from('staff')
        .select('id, name, wallet_address')
        .not('wallet_address', 'is', null)
      
      if (staff) {
        staff.forEach((member: any) => {
          participants.push({
            walletAddress: member.wallet_address,
            type: 'staff',
            name: member.name || `Staff ${member.id}`,
            id: member.id
          })
        })
      }
      
      // Обновляем список участников
      this.ecosystemData.participants = participants
      this.ecosystemData.lastParticipantsRefresh = Date.now()
      
      const teams_count = participants.filter(p => p.type === 'team').length
      const startups_count = participants.filter(p => p.type === 'startup').length
      const staff_count = participants.filter(p => p.type === 'staff').length
      
      console.log(`✅ Обновлен список участников: ${participants.length} (${teams_count} команд, ${startups_count} стартапов, ${staff_count} сотрудников)`)
      
    } catch (error) {
      console.error(`❌ Ошибка получения участников:`, error)
    }
  }

  /**
   * Полное обновление данных всех участников (ОТКЛЮЧЕНО)
   */
  async refreshAllData(): Promise<void> {
    console.log('⚠️ refreshAllData отключен для предотвращения дублирования запросов')
    console.log('💡 Используйте PublicDashboard для загрузки данных')
    return
  }

  /**
   * Batch-загрузка балансов всех участников (ОТКЛЮЧЕНО)
   */
  private async refreshAllBalances(): Promise<void> {
    console.log('⚠️ refreshAllBalances отключен для предотвращения дублирования с PublicDashboard')
    return
  }

  /**
   * ✅ ОПТИМИЗИРОВАННАЯ: Batch-загрузка NFT всех участников одним запросом (ОТКЛЮЧЕНО)
   */
  private async refreshAllNFTs(): Promise<void> {
    console.log('⚠️ refreshAllNFTs отключен для предотвращения дублирования с PublicDashboard')
    return
  }

  /**
   * Получить данные участника (мгновенно из кэша)
   */
  getParticipantData(walletAddress: string): {
    participant: DynamicParticipant | null
    balance: number
    nfts: any[]
    transactions: any[]
    lastUpdate: number
  } {
    const participant = this.ecosystemData.participants.find(p => p.walletAddress === walletAddress)
    
    return {
      participant: participant || null,
      balance: this.ecosystemData.balances.get(walletAddress) || 0,
      nfts: this.ecosystemData.nfts.get(walletAddress) || [],
      transactions: this.ecosystemData.transactions.get(walletAddress) || [],
      lastUpdate: this.ecosystemData.lastUpdate
    }
  }

  /**
   * Получить статистику экосистемы
   */
  getEcosystemStats(): {
    totalParticipants: number
    teams: number
    startups: number
    staff: number
    totalBalance: number
    totalNFTs: number
    totalTransactions: number
    lastUpdate: number
    lastParticipantsRefresh: number
    cacheAge: number
    participantsAge: number
  } {
    const totalBalance = Array.from(this.ecosystemData.balances.values())
      .reduce((sum, balance) => sum + balance, 0)
    
    const totalNFTs = Array.from(this.ecosystemData.nfts.values())
      .reduce((sum, nfts) => sum + nfts.length, 0)
    
    const totalTransactions = Array.from(this.ecosystemData.transactions.values())
      .reduce((sum, txs) => sum + txs.length, 0)
    
    const teams = this.ecosystemData.participants.filter(p => p.type === 'team').length
    const startups = this.ecosystemData.participants.filter(p => p.type === 'startup').length
    const staff = this.ecosystemData.participants.filter(p => p.type === 'staff').length
    
    return {
      totalParticipants: this.ecosystemData.participants.length,
      teams,
      startups,
      staff,
      totalBalance,
      totalNFTs,
      totalTransactions,
      lastUpdate: this.ecosystemData.lastUpdate,
      lastParticipantsRefresh: this.ecosystemData.lastParticipantsRefresh,
      cacheAge: Date.now() - this.ecosystemData.lastUpdate,
      participantsAge: Date.now() - this.ecosystemData.lastParticipantsRefresh
    }
  }

  /**
   * Получить всех участников
   */
  getAllParticipants(): DynamicParticipant[] {
    return [...this.ecosystemData.participants]
  }

  /**
   * Получить всех участников С балансами (для устранения дублирования запросов)
   */
  getAllParticipantsWithBalances(): Array<DynamicParticipant & { balance: number }> {
    return this.ecosystemData.participants.map(participant => ({
      ...participant,
      balance: this.ecosystemData.balances.get(participant.walletAddress) || 0
    }))
  }

  /**
   * Принудительное обновление данных конкретного участника (ОТКЛЮЧЕНО)
   */
  async refreshParticipant(walletAddress: string): Promise<void> {
    console.log('⚠️ refreshParticipant отключен для предотвращения дублирования запросов')
    return
  }

  private startPeriodicRefresh(): void {
    console.log('⚠️ Периодическое обновление отключено для предотвращения дублирования запросов')
    return
  }

  /**
   * Остановка периодических обновлений
   */
  stopPeriodicRefresh(): void {
    console.log('⚠️ Периодические обновления отключены')
  }
}

// Глобальный экземпляр
export const dynamicEcosystemCache = new DynamicEcosystemCache()

// Типы для экспорта
export type { DynamicParticipant }