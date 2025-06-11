// Глобальное кэширование для замкнутой экосистемы PEcoin
// Загружает и синхронизирует данные всех участников

import { serverCache } from './server-cache'
import { getCachedTokenBalances } from './cached-token-balance'

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
   * Инициализация участников экосистемы
   */
  async initializeEcosystem(participants: EcosystemParticipant[]): Promise<void> {
    console.log(`🌐 Инициализация экосистемы: ${participants.length} участников`)
    this.participants = participants
    
    // Первоначальная загрузка всех данных
    await this.refreshAllData()
    
    // Запускаем периодическое обновление
    this.startPeriodicRefresh()
    
    console.log(`✅ Экосистема инициализирована для ${participants.length} участников`)
  }

  /**
   * Полное обновление данных всех участников
   */
  async refreshAllData(): Promise<void> {
    const startTime = Date.now()
    console.log(`🔄 Глобальное обновление данных экосистемы...`)
    
    try {
      // 1. Загружаем балансы всех участников batch-запросом
      await this.refreshAllBalances()
      
      // 2. Загружаем NFT для всех участников параллельно
      await this.refreshAllNFTs()
      
      // 3. Загружаем последние транзакции для всех участников
      await this.refreshAllTransactions()
      
      this.ecosystemData.lastUpdate = Date.now()
      const totalTime = Date.now() - startTime
      
      console.log(`✅ Глобальное обновление завершено за ${totalTime}ms`)
      console.log(`📊 Загружено: ${this.ecosystemData.balances.size} балансов, ${this.ecosystemData.nfts.size} NFT коллекций`)
      
    } catch (error) {
      console.error(`❌ Ошибка глобального обновления:`, error)
    }
  }

  /**
   * Batch-загрузка балансов всех участников
   */
  private async refreshAllBalances(): Promise<void> {
    const wallets = this.participants.map(p => p.walletAddress)
    
    try {
      // Используем существующий batch API
      const response = await fetch('/api/token-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallets,
          mint: this.PECOIN_MINT
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Обновляем локальный кэш
        Object.entries(data.balances).forEach(([wallet, balance]) => {
          this.ecosystemData.balances.set(wallet, balance as number)
        })
        
        console.log(`✅ Batch-загружено ${Object.keys(data.balances).length} балансов`)
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки балансов:`, error)
    }
  }

  /**
   * Параллельная загрузка NFT всех участников
   */
  private async refreshAllNFTs(): Promise<void> {
    const batchSize = 10 // Загружаем по 10 участников параллельно
    
    for (let i = 0; i < this.participants.length; i += batchSize) {
      const batch = this.participants.slice(i, i + batchSize)
      
      const promises = batch.map(async (participant) => {
        try {
          const response = await fetch('/api/nft-collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: participant.walletAddress })
          })
          
          if (response.ok) {
            const data = await response.json()
            this.ecosystemData.nfts.set(participant.walletAddress, data.nfts || [])
            return data.nfts?.length || 0
          }
        } catch (error) {
          console.error(`❌ Ошибка загрузки NFT для ${participant.walletAddress}:`, error)
          return 0
        }
      })
      
      const results = await Promise.all(promises)
      const totalNFTs = results.reduce((sum, count) => sum + count, 0)
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: загружено ${totalNFTs} NFT`)
      
      // Пауза между батчами чтобы не перегружать API
      if (i + batchSize < this.participants.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  /**
   * Загрузка последних транзакций для активных участников
   */
  private async refreshAllTransactions(): Promise<void> {
    // Загружаем транзакции только для участников с балансом > 0
    const activeParticipants = this.participants.filter(p => 
      (this.ecosystemData.balances.get(p.walletAddress) || 0) > 0
    )
    
    console.log(`🔄 Загрузка транзакций для ${activeParticipants.length} активных участников`)
    
    const promises = activeParticipants.map(async (participant) => {
      try {
        const response = await fetch('/api/pecoin-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress: participant.walletAddress,
            limit: 10 
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          this.ecosystemData.transactions.set(participant.walletAddress, data.transactions || [])
          return data.transactions?.length || 0
        }
      } catch (error) {
        console.error(`❌ Ошибка загрузки транзакций для ${participant.walletAddress}:`, error)
        return 0
      }
    })
    
    const results = await Promise.all(promises)
    const totalTxs = results.reduce((sum, count) => sum + count, 0)
    console.log(`✅ Загружено ${totalTxs} транзакций`)
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
   * Принудительное обновление данных конкретного участника
   */
  async refreshParticipant(walletAddress: string): Promise<void> {
    const participant = this.participants.find(p => p.walletAddress === walletAddress)
    if (!participant) return

    console.log(`🔄 Обновление данных участника: ${walletAddress}`)
    
    // Параллельно обновляем все типы данных
    await Promise.all([
      this.refreshParticipantBalance(walletAddress),
      this.refreshParticipantNFTs(walletAddress),
      this.refreshParticipantTransactions(walletAddress)
    ])
  }

  private async refreshParticipantBalance(walletAddress: string): Promise<void> {
    // Инвалидируем кэш и загружаем заново
    serverCache.invalidate(`token-balance:owner:${walletAddress}`)
    await this.refreshAllBalances()
  }

  private async refreshParticipantNFTs(walletAddress: string): Promise<void> {
    serverCache.invalidate(`nft-collection:wallet:${walletAddress}`)
    
    try {
      const response = await fetch('/api/nft-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })
      
      if (response.ok) {
        const data = await response.json()
        this.ecosystemData.nfts.set(walletAddress, data.nfts || [])
      }
    } catch (error) {
      console.error(`❌ Ошибка обновления NFT для ${walletAddress}:`, error)
    }
  }

  private async refreshParticipantTransactions(walletAddress: string): Promise<void> {
    serverCache.invalidate(`tx-history:${walletAddress}`)
    
    try {
      const response = await fetch('/api/pecoin-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, limit: 10 })
      })
      
      if (response.ok) {
        const data = await response.json()
        this.ecosystemData.transactions.set(walletAddress, data.transactions || [])
      }
    } catch (error) {
      console.error(`❌ Ошибка обновления транзакций для ${walletAddress}:`, error)
    }
  }

  /**
   * Запуск периодического обновления
   */
  private startPeriodicRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    
    this.refreshTimer = setInterval(() => {
      console.log(`⏰ Периодическое обновление экосистемы`)
      this.refreshAllData()
    }, this.GLOBAL_REFRESH_INTERVAL)
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
}

// Глобальный экземпляр
export const ecosystemCache = new EcosystemCache()

// Типы для экспорта
export type { EcosystemParticipant } 