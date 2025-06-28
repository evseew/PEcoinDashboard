import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { signedUrlCache } from '@/lib/signed-url-cache'
import { globalBalanceCache } from '@/hooks/use-dashboard-balances'
import { walletNameResolver } from '@/lib/wallet-name-resolver'

// ✅ ПЕРЕИСПОЛЬЗУЕМ существующие хуки вместо дублирования
import { useHybridNft } from '@/hooks/use-hybrid-nft'

interface EntityDetailData {
  id: string
  name: string
  description: string
  balance: number
  logo: string | null
  walletAddress: string
  achievements?: any
  ageDisplay?: string
  ageRangeMin?: number
  ageRangeMax?: number
  nfts: any[]
  nftCount: number
  transactions: any[]
  transactionsLoading: boolean
  nftsLoading: boolean
}

interface UseEntityDetailOptions {
  entityType: string
  entityId: string
  // ✅ ОПЦИОНАЛЬНО: Предзагруженные данные для быстрого отображения (будут обновлены)
  preloadedNFTCount?: number
  preloadedNFTs?: any[]
}

export function useEntityDetail({ 
  entityType, 
  entityId,
  preloadedNFTCount = 0,
  preloadedNFTs = []
}: UseEntityDetailOptions) {
  const [entity, setEntity] = useState<EntityDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextBeforeSignature, setNextBeforeSignature] = useState<string | undefined>()
  const [nftLoadStarted, setNftLoadStarted] = useState<string | null>(null) // ✅ Флаг загрузки NFT

  // ✅ ПЕРЕИСПОЛЬЗУЕМ существующий хук для NFT данных
  const { getWalletNFTs } = useHybridNft()

  const isTeam = entityType === "teams" || entityType === "team"

  // ✅ Функция для сжатия адреса кошелька
  const formatAddress = useCallback((address: string): string => {
    if (!address || address.length <= 12) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }, [])

  // ✅ Функция для обогащения транзакций именами участников
  const enrichTransactionsWithNames = useCallback(async (transactions: any[]) => {
    console.log(`[useEntityDetail] 👥 Обогащаю ${transactions.length} транзакций именами...`)
    
    const enrichedTransactions = []
    
    for (const tx of transactions) {
      const senderInfo = await walletNameResolver.getNameForWallet(tx.sender)
      const receiverInfo = await walletNameResolver.getNameForWallet(tx.receiver)
      
      enrichedTransactions.push({
        ...tx,
        senderInfo,
        receiverInfo,
        senderName: senderInfo?.name || formatAddress(tx.sender) || 'Unknown',
        receiverName: receiverInfo?.name || formatAddress(tx.receiver) || 'Unknown'
      })
    }
    
    console.log(`[useEntityDetail] ✅ Обогащено ${enrichedTransactions.length} транзакций именами`)
    return enrichedTransactions
  }, [formatAddress])

  // ✅ ИСПРАВЛЕНО: Реактивное обновление баланса из globalBalanceCache
  useEffect(() => {
    if (entity?.walletAddress) {
      const newBalance = globalBalanceCache.balances[entity.walletAddress] || 0
      setEntity(prev => prev ? { ...prev, balance: newBalance } : null)
    }
  }, [globalBalanceCache.balances, entity?.walletAddress])

  // ✅ Загрузка основных данных сущности
  const fetchEntityData = useCallback(async () => {
    if (!entityId) return

    setLoading(true)
    setError(null)

    try {
      // Параллельный запрос в зависимости от типа
      const { data, error: dbError } = isTeam 
        ? await supabase.from("teams").select("*").eq("id", entityId).single()
        : await supabase.from("startups").select("*").eq("id", entityId).single()

      if (dbError || !data) {
        setError("Entity not found")
        return
      }

      // ✅ ОПТИМИЗАЦИЯ: Используем баланс из globalBalanceCache
      const balance = globalBalanceCache.balances[data.wallet_address] || 0
      
      // Получаем signed URL для логотипа
      const logo = await signedUrlCache.getSignedUrl(data.logo_url)

      setEntity({
        id: data.id,
        name: data.name,
        description: data.description,
        balance,
        logo,
        walletAddress: data.wallet_address,
        achievements: data.achievements,
        ageDisplay: data.age_display,
        ageRangeMin: data.age_range_min,
        ageRangeMax: data.age_range_max,
        // ✅ НАЧИНАЕМ с предзагруженных данных (будут перезаписаны после загрузки полных данных)
        nfts: preloadedNFTs,
        nftCount: preloadedNFTCount,
        transactions: [],
        transactionsLoading: false,
        nftsLoading: false
      })

      // ✅ СБРАСЫВАЕМ флаг загрузки NFT при смене entity
      setNftLoadStarted(null)

      console.log(`[useEntityDetail] ✅ Загружен ${data.name} с балансом ${balance} PEcoin`)
      
    } catch (err) {
      console.error('[useEntityDetail] ❌ Ошибка загрузки:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [entityId, entityType, isTeam, preloadedNFTCount, preloadedNFTs])

  // ✅ РЕФАКТОРИНГ: Использую существующий хук вместо дублирования fetch логики
  const loadNFTs = useCallback(async (walletAddress: string, entityName: string) => {
    // ✅ ЗАЩИТА: Проверяем что загрузка еще не идет
    setEntity(prev => {
      if (!prev || prev.nftsLoading) {
        console.log(`[useEntityDetail] ⏸️ NFT уже загружаются для ${entityName}, пропускаем`)
        return prev
      }
      return { ...prev, nftsLoading: true }
    })

    try {
      console.log(`[useEntityDetail] 🎨 Загружаю NFT для ${entityName}...`)
      
      // ✅ ПЕРЕИСПОЛЬЗУЕМ существующий хук вместо fetch
      const response = await getWalletNFTs(walletAddress)

      if (response.success && response.nfts && Array.isArray(response.nfts)) {
        const nfts = response.nfts.map((nft: any) => ({
          id: nft.mintAddress,
          name: nft.name,
          image: nft.image,
          description: nft.description,
          collection: nft.collection,
          symbol: nft.symbol,
          uri: nft.uri,
          attributes: nft.attributes,
          mintAddress: nft.mintAddress,
          isCompressed: nft.isCompressed,
          treeId: nft.treeId
        }))

        setEntity(prev => prev ? { ...prev, nfts, nftCount: nfts.length, nftsLoading: false } : null)
        console.log(`[useEntityDetail] ✅ Загружено ${nfts.length} NFT через переиспользованный хук`)
      } else {
        setEntity(prev => prev ? { ...prev, nfts: [], nftCount: 0, nftsLoading: false } : null)
        console.log(`[useEntityDetail] ℹ️ Нет NFT для ${entityName}`, response)
      }
    } catch (error) {
      console.error('[useEntityDetail] ❌ Ошибка загрузки NFT:', error)
      setEntity(prev => prev ? { ...prev, nfts: [], nftsLoading: false } : null)
    }
  }, [getWalletNFTs])

  // ✅ ОБЪЕДИНЕННАЯ загрузка транзакций (PEcoin + NFT) - здесь fetch оправдан т.к. это комбинированная логика
  const loadTransactions = useCallback(async (beforeSignature?: string) => {
    if (!entity?.walletAddress) return

    setEntity(prev => prev ? { ...prev, transactionsLoading: true } : null)

    try {
      console.log(`[useEntityDetail] 📊 Загружаю транзакции для ${entity.name}...`)
      
      // ✅ ПАРАЛЛЕЛЬНАЯ загрузка PEcoin и NFT транзакций  
      const [pecoinRes, nftRes] = await Promise.all([
        fetch("/api/pecoin-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            walletAddress: entity.walletAddress, 
            limit: 10, 
            beforeSignature 
          })
        }),
        fetch("/api/nft-transactions", {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            walletAddress: entity.walletAddress, 
            limit: 10 
          })
        })
      ])

      const allTransactions: any[] = []
      let nextSignature: string | undefined

      // Обрабатываем PEcoin транзакции
      if (pecoinRes.ok) {
        const pecoinData = await pecoinRes.json()
        const pecoinTxs = (pecoinData.transactions || []).map((tx: any) => ({
          ...tx,
          type: "Token"
        }))
        allTransactions.push(...pecoinTxs)
        nextSignature = pecoinData.nextBeforeSignature
      }

      // Обрабатываем NFT транзакции  
      if (nftRes.ok) {
        const nftData = await nftRes.json()
        const nftTxs = (nftData.transactions || []).map((tx: any) => ({
          ...tx,
          amount: 1,
          nftName: tx.nftName,
          sender: tx.from,
          receiver: tx.to,
          date: tx.date
        }))
        allTransactions.push(...nftTxs)
      }

      // Сортируем по дате
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // ✅ ОБОГАЩАЕМ транзакции именами участников
      const enrichedTransactions = await enrichTransactionsWithNames(allTransactions)

      setEntity(prev => {
        if (!prev) return null
        
        const newTransactions = beforeSignature 
          ? [...prev.transactions, ...enrichedTransactions]
          : enrichedTransactions

        return { ...prev, transactions: newTransactions }
      })

      setNextBeforeSignature(nextSignature)
      console.log(`[useEntityDetail] ✅ Загружено ${enrichedTransactions.length} транзакций для ${entity.name}`)

    } catch (error) {
      console.error('[useEntityDetail] ❌ Ошибка загрузки транзакций:', error)
    } finally {
      setEntity(prev => prev ? { ...prev, transactionsLoading: false } : null)
    }
  }, [entity?.walletAddress, entity?.name, enrichTransactionsWithNames])

  // Загрузка при инициализации
  useEffect(() => {
    fetchEntityData()
  }, [fetchEntityData])

  // ✅ ОТДЕЛЬНЫЕ эффекты для NFT и транзакций для независимой загрузки
  useEffect(() => {
    if (entity?.walletAddress && 
        entity.nfts.length === 0 && 
        !entity.nftsLoading && 
        nftLoadStarted !== entity.walletAddress) {
      console.log(`[useEntityDetail] 🎨 Автоматически загружаю NFT для ${entity.name}`)
      setNftLoadStarted(entity.walletAddress) // ✅ Помечаем что загрузка начата
      loadNFTs(entity.walletAddress, entity.name)
    }
  }, [entity?.walletAddress, entity?.name, entity?.nftsLoading, nftLoadStarted])

  useEffect(() => {
    if (entity?.walletAddress && entity.transactions.length === 0 && !entity.transactionsLoading) {
      console.log(`[useEntityDetail] 📊 Автоматически загружаю транзакции для ${entity.name}`)
      loadTransactions()
    }
  }, [entity?.walletAddress, entity?.name, entity?.transactions.length, entity?.transactionsLoading, loadTransactions])

  const loadMoreTransactions = useCallback(() => {
    if (nextBeforeSignature) {
      loadTransactions(nextBeforeSignature)
    }
  }, [nextBeforeSignature, loadTransactions])

  return {
    entity,
    loading,
    error,
    nextBeforeSignature,
    
    // Методы
    loadMoreTransactions,
    refresh: fetchEntityData
  }
} 