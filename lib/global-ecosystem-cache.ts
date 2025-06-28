// Глобальное кэширование для замкнутой экосистемы PEcoin
// Загружает и синхронизирует данные всех участников

// ✅ УБРАНО: getCachedTokenBalances и serverCache больше не используются в отключенном кэше

interface EcosystemParticipant {
  walletAddress: string
  type: 'team' | 'startup' | 'employee'
  name: string
  entity?: string // название команды/стартапа для сотрудников
}

interface EcosystemData {
  balances: Map<string, number>
  nfts: Map<string, any[]>
  transactions: Map<string, any[]>
  lastUpdate: number
}

class EcosystemCache {
  private participants: EcosystemParticipant[] = []
  private ecosystemData: EcosystemData = {
    balances: new Map(),
    nfts: new Map(),
    transactions: new Map(),
    lastUpdate: 0
  }
  
  private readonly GLOBAL_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 минут
  private readonly PECOIN_MINT = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  private refreshTimer?: NodeJS.Timeout

  /**
   * Автоматическая инициализация экосистемы (ПОЛНОСТЬЮ ОТКЛЮЧЕНО)
   */
  async initializeEcosystem(participants: EcosystemParticipant[]): Promise<void> {
    // ✅ ПОЛНОСТЬЮ ОТКЛЮЧЕНО для предотвращения дублирования запросов с PublicDashboard
    console.log('⚠️ GlobalEcosystemCache полностью отключен для предотвращения дублирования запросов')
    console.log('💡 Данные загружаются через PublicDashboard и AdminDashboard')
    return
  }

  /**
   * Полное обновление данных всех участников (ОТКЛЮЧЕНО)
   */
  async refreshAllData(): Promise<void> {
    console.log('⚠️ GlobalEcosystemCache.refreshAllData отключен для предотвращения дублирования запросов')
    console.log('💡 Используйте PublicDashboard для загрузки данных')
    return
  }

  /**
   * Batch-загрузка балансов всех участников (ОТКЛЮЧЕНО)
   */
  private async refreshAllBalances(): Promise<void> {
    console.log('⚠️ GlobalEcosystemCache.refreshAllBalances отключен для предотвращения дублирования с PublicDashboard')
    return
  }

  /**
   * ✅ ОПТИМИЗИРОВАННАЯ: Batch-загрузка NFT всех участников одним запросом (ОТКЛЮЧЕНО)
   */
  private async refreshAllNFTs(): Promise<void> {
    console.log('⚠️ GlobalEcosystemCache.refreshAllNFTs отключен для предотвращения дублирования с PublicDashboard')
    return
  }

  /**
   * Загрузка последних транзакций для активных участников (ОТКЛЮЧЕНО)
   */
  private async refreshAllTransactions(): Promise<void> {
    console.log('⚠️ GlobalEcosystemCache.refreshAllTransactions отключен для предотвращения дублирования запросов')
    return
  }

  /**
   * Получить данные участника (мгновенно из кэша)
   */
  getParticipantData(walletAddress: string): {
    balance: number
    nfts: any[]
    transactions: any[]
    lastUpdate: number
  } {
    return {
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
    totalBalance: number
    totalNFTs: number
    totalTransactions: number
    lastUpdate: number
    cacheAge: number
  } {
    const totalBalance = Array.from(this.ecosystemData.balances.values())
      .reduce((sum, balance) => sum + balance, 0)
    
    const totalNFTs = Array.from(this.ecosystemData.nfts.values())
      .reduce((sum, nfts) => sum + nfts.length, 0)
    
    const totalTransactions = Array.from(this.ecosystemData.transactions.values())
      .reduce((sum, txs) => sum + txs.length, 0)
    
    return {
      totalParticipants: this.participants.length,
      totalBalance,
      totalNFTs,
      totalTransactions,
      lastUpdate: this.ecosystemData.lastUpdate,
      cacheAge: Date.now() - this.ecosystemData.lastUpdate
    }
  }

  /**
   * Принудительное обновление данных конкретного участника (ОТКЛЮЧЕНО)
   */
  async refreshParticipant(walletAddress: string): Promise<void> {
    console.log('⚠️ GlobalEcosystemCache.refreshParticipant отключен для предотвращения дублирования запросов')
    return
  }

  /**
   * Запуск периодического обновления (ОТКЛЮЧЕНО)
   */
  private startPeriodicRefresh(): void {
    console.log('⚠️ GlobalEcosystemCache.startPeriodicRefresh отключен для предотвращения дублирования запросов')
    return
  }

  /**
   * Остановка периодического обновления
   */
  stopPeriodicRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  private async refreshParticipantNFTs(walletAddress: string): Promise<void> {
    console.log('⚠️ refreshParticipantNFTs отключен для предотвращения дублирования запросов')
    return
  }

  private async refreshParticipantTransactions(walletAddress: string): Promise<void> {
    console.log('⚠️ refreshParticipantTransactions отключен для предотвращения дублирования запросов')
    return
  }
}

// Глобальный экземпляр
export const ecosystemCache = new EcosystemCache()

// Типы для экспорта
export type { EcosystemParticipant } 