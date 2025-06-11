// Динамическое глобальное кэширование для экосистемы PEcoin
// Автоматически получает участников из основной системы entities

import { serverCache } from './server-cache'
import { fetchTransactionHistory } from '../app/api/pecoin-history/route'

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
  
  private readonly GLOBAL_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 минут
  private readonly PARTICIPANTS_REFRESH_INTERVAL = 30 * 60 * 1000 // 30 минут (участники меняются реже)
  private readonly PECOIN_MINT = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  private refreshTimer?: NodeJS.Timeout
  private participantsTimer?: NodeJS.Timeout

  /**
   * Автоматическая инициализация экосистемы
   */
  async autoInitialize(): Promise<void> {
    console.log(`🌐 Автоинициализация динамической экосистемы`)
    
    // Получаем актуальный список участников
    await this.refreshParticipants()
    
    if (this.ecosystemData.participants.length === 0) {
      console.log(`⚠️ Не найдено участников экосистемы`)
      return
    }
    
    // Первоначальная загрузка всех данных
    await this.refreshAllData()
    
    // Запускаем периодические обновления
    this.startPeriodicRefresh()
    
    console.log(`✅ Динамическая экосистема инициализирована для ${this.ecosystemData.participants.length} участников`)
  }

  /**
   * Получение актуального списка участников из API
   */
  async refreshParticipants(): Promise<void> {
    console.log(`🔄 Обновление списка участников...`)
    
    try {
      const participants: DynamicParticipant[] = []
      
      // Получаем данные напрямую из Supabase (избегаем проблем с fetch на сервере)
      const { supabase } = await import('@/lib/supabaseClient')
      
      // Получаем команды
      const { data: teamsData } = await supabase.from('teams').select('*')
      if (teamsData) {
        teamsData.forEach((team: any) => {
          if (team.wallet_address) {
            participants.push({
              walletAddress: team.wallet_address,
              type: 'team',
              name: team.name || `Team ${team.id}`,
              id: team.id
            })
          }
        })
      }
      
      // Получаем стартапы  
      const { data: startupsData } = await supabase.from('startups').select('*')
      if (startupsData) {
        startupsData.forEach((startup: any) => {
          if (startup.wallet_address) {
            participants.push({
              walletAddress: startup.wallet_address,
              type: 'startup', 
              name: startup.name || `Startup ${startup.id}`,
              id: startup.id
            })
          }
        })
      }
      
      // Получаем сотрудников
      const { data: staffData } = await supabase.from('staff').select('*')
      if (staffData) {
        staffData.forEach((person: any) => {
          if (person.wallet_address) {
            participants.push({
              walletAddress: person.wallet_address,
              type: 'staff',
              name: person.name || `Staff ${person.id}`,
              id: person.id
            })
          }
        })
      }
      
      // Обновляем список участников
      this.ecosystemData.participants = participants
      this.ecosystemData.lastParticipantsRefresh = Date.now()
      
      const teamsCount = participants.filter(p => p.type === 'team').length
      const startupsCount = participants.filter(p => p.type === 'startup').length
      const staffCount = participants.filter(p => p.type === 'staff').length
      
      console.log(`✅ Обновлен список участников: ${participants.length} (${teamsCount} команд, ${startupsCount} стартапов, ${staffCount} сотрудников)`)
      
    } catch (error) {
      console.error(`❌ Ошибка получения участников:`, error)
    }
  }

  /**
   * Полное обновление данных всех участников
   */
  async refreshAllData(): Promise<void> {
    const startTime = Date.now()
    console.log(`🔄 Глобальное обновление данных экосистемы...`)
    
    try {
      // Проверяем, нужно ли обновить список участников
      if (Date.now() - this.ecosystemData.lastParticipantsRefresh > this.PARTICIPANTS_REFRESH_INTERVAL) {
        await this.refreshParticipants()
      }
      
      if (this.ecosystemData.participants.length === 0) {
        console.log(`⚠️ Нет участников для обновления`)
        return
      }
      
      // 1. Загружаем балансы всех участников batch-запросом
      await this.refreshAllBalances()
      
      // 2. Загружаем NFT для всех участников параллельно
      await this.refreshAllNFTs()
      
      // 3. Загружаем последние транзакции для активных участников
      // await this.refreshAllTransactions() // ОТКЛЮЧЕНО: транзакции теперь грузятся по требованию
      
      this.ecosystemData.lastUpdate = Date.now()
      const totalTime = Date.now() - startTime
      
      console.log(`✅ Глобальное обновление завершено за ${totalTime}ms`)
      console.log(`📊 Загружено: ${this.ecosystemData.balances.size} балансов, ${this.ecosystemData.nfts.size} NFT коллекций (транзакции по требованию)`)
      
    } catch (error) {
      console.error(`❌ Ошибка глобального обновления:`, error)
    }
  }

  /**
   * Batch-загрузка балансов всех участников
   */
  private async refreshAllBalances(): Promise<void> {
    const wallets = this.ecosystemData.participants.map(p => p.walletAddress)
    
    if (wallets.length === 0) return
    
    try {
      // На сервере используем прямой вызов к библиотеке Alchemy
      if (typeof window === 'undefined') {
        const { getSplTokenBalance } = await import('@/lib/alchemy/solana')
        console.log(`🔄 Серверная загрузка балансов для ${wallets.length} кошельков`)
        
        const promises = wallets.map(async (wallet) => {
          try {
            const balance = await getSplTokenBalance({
              owner: wallet,
              mint: this.PECOIN_MINT
            })
            return { wallet, balance: balance || 0 }
          } catch (error) {
            console.error(`❌ Ошибка загрузки баланса ${wallet}:`, error)
            return { wallet, balance: 0 }
          }
        })
        
        const results = await Promise.all(promises)
        results.forEach(({ wallet, balance }) => {
          this.ecosystemData.balances.set(wallet, balance)
        })
        
        console.log(`✅ Серверная загрузка: ${results.length} балансов`)
        return
      }
      
      // В браузере используем API endpoint
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
        
        console.log(`✅ Клиентская загрузка: ${Object.keys(data.balances).length} балансов`)
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки балансов:`, error)
    }
  }

  /**
   * Параллельная загрузка NFT всех участников
   */
  private async refreshAllNFTs(): Promise<void> {
    if (this.ecosystemData.participants.length === 0) return
    
    // Пропускаем загрузку NFT на сервере
    if (typeof window === 'undefined') {
      console.log(`⚠️ Пропуск загрузки NFT на сервере`)
      return
    }
    
    const batchSize = 8 // Меньший размер батча для стабильности
    
    for (let i = 0; i < this.ecosystemData.participants.length; i += batchSize) {
      const batch = this.ecosystemData.participants.slice(i, i + batchSize)
      
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
          console.error(`❌ Ошибка загрузки NFT для ${participant.name}:`, error)
          return 0
        }
      })
      
      const results = await Promise.all(promises)
      const totalNFTs = results.reduce((sum, count) => sum + count, 0)
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: загружено ${totalNFTs} NFT`)
      
      // Пауза между батчами
      if (i + batchSize < this.ecosystemData.participants.length) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }
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
   * Принудительное обновление данных конкретного участника
   */
  async refreshParticipant(walletAddress: string): Promise<void> {
    const participant = this.ecosystemData.participants.find(p => p.walletAddress === walletAddress)
    if (!participant) {
      console.log(`⚠️ Участник ${walletAddress} не найден в экосистеме`)
      return
    }

    console.log(`🔄 Обновление данных участника: ${participant.name}`)
    
    // Параллельно обновляем все типы данных
    await Promise.all([
      this.refreshParticipantBalance(walletAddress),
      this.refreshParticipantNFTs(walletAddress),
      this.refreshParticipantTransactions(walletAddress)
    ])
  }

  private async refreshParticipantBalance(walletAddress: string): Promise<void> {
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
   * Запуск периодических обновлений
   */
  private startPeriodicRefresh(): void {
    // Остановка существующих таймеров
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    if (this.participantsTimer) clearInterval(this.participantsTimer)
    
    // Обновление данных каждые 5 минут
    this.refreshTimer = setInterval(() => {
      console.log(`⏰ Периодическое обновление данных экосистемы`)
      this.refreshAllData()
    }, this.GLOBAL_REFRESH_INTERVAL)
    
    // Обновление списка участников каждые 30 минут
    this.participantsTimer = setInterval(() => {
      console.log(`⏰ Периодическое обновление списка участников`)
      this.refreshParticipants()
    }, this.PARTICIPANTS_REFRESH_INTERVAL)
  }

  /**
   * Остановка периодических обновлений
   */
  stopPeriodicRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
    if (this.participantsTimer) {
      clearInterval(this.participantsTimer)
      this.participantsTimer = undefined
    }
  }

  /**
   * Публичный метод для обновления транзакций конкретного участника
   */
  updateTransactions(walletAddress: string, transactions: any[]): void {
    this.ecosystemData.transactions.set(walletAddress, transactions);
    console.log(`[DynamicEcosystemCache] Обновлены транзакции для ${walletAddress}`);
  }
}

// Глобальный экземпляр
export const dynamicEcosystemCache = new DynamicEcosystemCache()

// Типы для экспорта
export type { DynamicParticipant } 