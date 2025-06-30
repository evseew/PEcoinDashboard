import { useState, useEffect, useCallback, useRef } from 'react'
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
  // ✅ ОСНОВНЫЕ ДАННЫЕ (без флагов загрузки)
  const [entity, setEntity] = useState<EntityDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nextBeforeSignature, setNextBeforeSignature] = useState<string | undefined>()

  // ✅ РАЗДЕЛЕННЫЕ СОСТОЯНИЯ ЗАГРУЗКИ
  const [isLoadingEntity, setIsLoadingEntity] = useState(true)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false)

  // ✅ ФЛАГИ ИНИЦИАЛИЗАЦИИ (предотвращают повторные загрузки)
  const [transactionsInitialized, setTransactionsInitialized] = useState(false)
  const [nftsInitialized, setNftsInitialized] = useState(false)

  // ✅ REFS для стабильных значений (не вызывают пересоздание callback'ов)
  const walletAddressRef = useRef<string>('')
  const entityNameRef = useRef<string>('')

  // ✅ ПЕРЕИСПОЛЬЗУЕМ существующий хук для NFT данных
  const { getWalletNFTs } = useHybridNft()

  const isTeam = entityType === "teams" || entityType === "team"

  // ✅ Функция для сжатия адреса кошелька (стабильная)
  const formatAddress = useCallback((address: string): string => {
    if (!address || address.length <= 12) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }, [])

  // ✅ Функция для обогащения транзакций именами (стабильная)
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

  // ✅ СТАБИЛЬНАЯ функция загрузки основных данных сущности
  const fetchEntityData = useCallback(async () => {
    if (!entityId) return

    setIsLoadingEntity(true)
    setError(null)
    
    // ✅ СБРОС состояний при загрузке новой entity
    setTransactionsInitialized(false)
    setNftsInitialized(false)

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

      // ✅ ОБНОВЛЯЕМ refs для стабильных значений
      walletAddressRef.current = data.wallet_address
      entityNameRef.current = data.name

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
        // ✅ НАЧИНАЕМ с предзагруженных данных
        nfts: preloadedNFTs,
        nftCount: preloadedNFTCount,
        transactions: []
      })

      console.log(`[useEntityDetail] ✅ Загружен ${data.name} с балансом ${balance} PEcoin`)
      
    } catch (err) {
      console.error('[useEntityDetail] ❌ Ошибка загрузки:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setIsLoadingEntity(false)
    }
  }, [entityId, isTeam, preloadedNFTCount, preloadedNFTs])

  // ✅ СТАБИЛЬНАЯ функция загрузки NFT (не зависит от entity state)
  const loadNFTs = useCallback(async () => {
    const walletAddress = walletAddressRef.current
    const entityName = entityNameRef.current
    
    if (!walletAddress || isLoadingNFTs || nftsInitialized) {
      console.log(`[useEntityDetail] ⏸️ NFT загрузка пропущена: wallet=${!!walletAddress}, loading=${isLoadingNFTs}, initialized=${nftsInitialized}`)
      return
    }

    setIsLoadingNFTs(true)

    try {
      console.log(`[useEntityDetail] 🎨 Загружаю NFT для ${entityName}...`)
      
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

        setEntity(prev => prev ? { ...prev, nfts, nftCount: nfts.length } : null)
        console.log(`[useEntityDetail] ✅ Загружено ${nfts.length} NFT`)
      } else {
        setEntity(prev => prev ? { ...prev, nfts: [], nftCount: 0 } : null)
        console.log(`[useEntityDetail] ℹ️ Нет NFT для ${entityName}`)
      }
    } catch (error) {
      console.error('[useEntityDetail] ❌ Ошибка загрузки NFT:', error)
      setEntity(prev => prev ? { ...prev, nfts: [] } : null)
    } finally {
      setIsLoadingNFTs(false)
      setNftsInitialized(true)
    }
  }, [getWalletNFTs, isLoadingNFTs, nftsInitialized])

  // ✅ СТАБИЛЬНАЯ функция загрузки транзакций (не зависит от entity state)
  const loadTransactions = useCallback(async (beforeSignature?: string) => {
    const walletAddress = walletAddressRef.current
    const entityName = entityNameRef.current
    
    if (!walletAddress || (isLoadingTransactions && !beforeSignature)) {
      console.log(`[useEntityDetail] ⏸️ Транзакции загрузка пропущена: wallet=${!!walletAddress}, loading=${isLoadingTransactions}`)
      return
    }

    setIsLoadingTransactions(true)

    try {
      console.log(`[useEntityDetail] 📊 Загружаю транзакции для ${entityName}${beforeSignature ? ' (дозагрузка)' : ''}...`)
      
      // ✅ ПАРАЛЛЕЛЬНАЯ загрузка PEcoin и NFT транзакций  
      const [pecoinRes, nftRes] = await Promise.all([
        fetch("/api/pecoin-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            walletAddress, 
            limit: 10, 
            beforeSignature 
          })
        }),
        fetch("/api/nft-transactions", {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            walletAddress, 
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
      console.log(`[useEntityDetail] ✅ Загружено ${enrichedTransactions.length} транзакций для ${entityName}`)

    } catch (error) {
      console.error('[useEntityDetail] ❌ Ошибка загрузки транзакций:', error)
    } finally {
      setIsLoadingTransactions(false)
      if (!beforeSignature) {
        setTransactionsInitialized(true)
      }
    }
  }, [enrichTransactionsWithNames, isLoadingTransactions])

  // ✅ РЕАКТИВНОЕ обновление баланса из globalBalanceCache
  useEffect(() => {
    if (entity?.walletAddress) {
      const newBalance = globalBalanceCache.balances[entity.walletAddress] || 0
      setEntity(prev => prev ? { ...prev, balance: newBalance } : null)
    }
  }, [globalBalanceCache.balances, entity?.walletAddress])

  // ✅ Загрузка основных данных при инициализации
  useEffect(() => {
    fetchEntityData()
  }, [fetchEntityData])

  // ✅ АВТОМАТИЧЕСКАЯ загрузка NFT после загрузки entity (БЕЗ циклических зависимостей)
  useEffect(() => {
    if (entity && !nftsInitialized && !isLoadingNFTs) {
      console.log(`[useEntityDetail] 🎨 Инициализирую загрузку NFT для ${entity.name}`)
      loadNFTs()
    }
  }, [entity?.id, nftsInitialized, isLoadingNFTs, loadNFTs])

  // ✅ АВТОМАТИЧЕСКАЯ загрузка транзакций после загрузки entity (БЕЗ циклических зависимостей)
  useEffect(() => {
    if (entity && !transactionsInitialized && !isLoadingTransactions) {
      console.log(`[useEntityDetail] 📊 Инициализирую загрузку транзакций для ${entity.name}`)
      loadTransactions()
    }
  }, [entity?.id, transactionsInitialized, isLoadingTransactions, loadTransactions])

  // ✅ СТАБИЛЬНАЯ функция дозагрузки транзакций
  const loadMoreTransactions = useCallback(() => {
    if (nextBeforeSignature && !isLoadingTransactions) {
      loadTransactions(nextBeforeSignature)
    }
  }, [nextBeforeSignature, isLoadingTransactions, loadTransactions])

  // ✅ СОСТАВНОЕ состояние loading для обратной совместимости
  const loading = isLoadingEntity

  return {
    entity,
    loading,
    error,
    nextBeforeSignature,
    
    // ✅ ДЕТАЛИЗИРОВАННЫЕ состояния загрузки
    isLoadingTransactions,
    isLoadingNFTs,
    
    // Методы
    loadMoreTransactions,
    refresh: fetchEntityData
  }
} 