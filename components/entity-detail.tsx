"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Heart, Sparkles, Rocket } from "lucide-react"
import { LoadingOverlay } from "@/components/loading-overlay"
import { ErrorOverlay } from "@/components/error-overlay"
import { TransactionTable } from "@/components/transaction-table"
import { NftGrid } from "@/components/nft-grid"
import { ThemeToggle } from "@/components/theme-toggle"
import { CampIcon } from "@/components/camp-icons"
import { AnimatedBackground } from "@/components/animated-background"
import { motion } from "framer-motion"
import { useTokenImageUrl } from "@/hooks/token-image-provider"
import { supabase } from "@/lib/supabaseClient"
import { signedUrlCache } from "@/lib/signed-url-cache"


interface EntityDetailProps {
  entityType: string
  entityId: string
}

// Кеш для зарегистрированных сущностей чтобы не делать повторные запросы
const entityCache = new Map<string, string>()

// Функция для поиска зарегистрированной сущности по адресу кошелька
async function findEntityByWallet(walletAddress: string): Promise<string | null> {
  if (entityCache.has(walletAddress)) {
    return entityCache.get(walletAddress) || null
  }

  try {
    // Ищем в команды
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("wallet_address", walletAddress)
      .single()
    
    if (team) {
      entityCache.set(walletAddress, team.name)
      return team.name
    }

    // Ищем в стартапы
    const { data: startup } = await supabase
      .from("startups")
      .select("name")
      .eq("wallet_address", walletAddress)
      .single()
    
    if (startup) {
      entityCache.set(walletAddress, startup.name)
      return startup.name
    }

    // Если есть таблица сотрудников, можно добавить поиск и там
    const { data: staff } = await supabase
      .from("staff")
      .select("name")
      .eq("wallet_address", walletAddress)
      .single()
    
    if (staff) {
      entityCache.set(walletAddress, staff.name)
      return staff.name
    }

    // Кешируем отсутствие результата
    entityCache.set(walletAddress, "")
    return null
  } catch (error) {
    console.error("Error finding entity by wallet:", error)
    return null
  }
}

// Функция для форматирования адреса кошелька (оставляем для совместимости)
function formatWalletAddress(address: string): string {
  if (!address || address === "Unknown" || address === "Unknown/Mint" || address === "Unknown/Burn" || address === "Unknown/Internal") {
    return address
  }
  
  // Сокращаем адрес: первые 4 символа + ... + последние 4 символа
  if (address.length > 12) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }
  return address
}

// Используем общую утилиту кэширования signed URLs
async function getSignedUrl(storageKey: string | null): Promise<string | null> {
  return signedUrlCache.getSignedUrl(storageKey)
}

export function EntityDetail({ entityType, entityId }: EntityDetailProps) {
  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  const pecoinImg = useTokenImageUrl(pecoinMint, "/images/pecoin.png")
  const alchemyApiKey = "VYK2v9vubZLxKwE9-ASUeQC6b1-zaVb1"

  // Все хуки должны быть вызваны до любого return!
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entity, setEntity] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [nfts, setNfts] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [nextBeforeSignature, setNextBeforeSignature] = useState<string | undefined>(undefined)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nftsLoading, setNftsLoading] = useState(false)
  const [nftsError, setNftsError] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const isTeam = entityType === "teams" || entityType === "team"

  // Получение данных сущности из Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      let data = null
      let error = null
      if (isTeam) {
        const res = await supabase.from("teams").select("*").eq("id", entityId).single()
        data = res.data
        error = res.error
      } else {
        const res = await supabase.from("startups").select("*").eq("id", entityId).single()
        data = res.data
        error = res.error
      }
      if (error || !data) {
        setError("Entity not found")
        setEntity(null)
        setLoading(false)
        return
      }

      try {
        // Получаем баланс через API
        const balanceResponse = await fetch("/api/token-balances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            wallets: [data.wallet_address],
            mint: pecoinMint 
          }),
        })

        let actualBalance = 0
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json()
          const rawBalance = balanceData.balances?.[data.wallet_address] || 0
          // Принудительно преобразуем в число, на случай если API вернул объект
          actualBalance = typeof rawBalance === 'number' ? rawBalance : Number(rawBalance) || 0
        } else {
          console.error("Ошибка получения баланса:", balanceResponse.status)
        }

        // Получаем signedUrl для логотипа
        const logo = await getSignedUrl(data.logo_url)
        setEntity({
          id: data.id,
          name: data.name,
          description: data.description,
          balance: actualBalance,
          logo,
          walletAddress: data.wallet_address,
          achievements: data.achievements,
          ageDisplay: data.age_display,
          ageRangeMin: data.age_range_min,
          ageRangeMax: data.age_range_max,
        })
      } catch (err) {
        console.error("Ошибка загрузки данных:", err)
        // Устанавливаем entity даже при ошибке загрузки баланса
        const logo = await getSignedUrl(data.logo_url)
        setEntity({
          id: data.id,
          name: data.name,
          description: data.description,
          balance: 0,
          logo,
          walletAddress: data.wallet_address,
          achievements: data.achievements,
          ageDisplay: data.age_display,
          ageRangeMin: data.age_range_min,
          ageRangeMax: data.age_range_max,
        })
      }
      setLoading(false)
    }
    fetchData()
  }, [entityId, entityType, isTeam])

  // Функция для получения NFT коллекции
  const fetchNFTCollection = useCallback(
    async (walletAddress: string) => {
      setNftsLoading(true)
      setNftsError(null)
      try {
        const res = await fetch("/api/nft-collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        })
        
        if (res.ok) {
          const data = await res.json()
          
          // Адаптируем данные для NftGrid компонента
          const adaptedNFTs = (data.nfts || []).map((nft: any) => ({
            id: nft.mintAddress,
            name: nft.name,
            image: nft.image,
            description: nft.description,
            collection: nft.collection,
            symbol: nft.symbol,
            uri: nft.uri,
            attributes: nft.attributes,
            mintAddress: nft.mintAddress
          }))
          
          setNfts(adaptedNFTs)
        } else {
          const errorData = await res.json()
          throw new Error(errorData.error || `HTTP ${res.status}`)
        }
      } catch (err) {
        console.error("Error fetching NFT collection:", err)
        setNftsError("Не удалось загрузить коллекцию NFT")
        setNfts([])
      } finally {
        setNftsLoading(false)
      }
    },
    []
  )

  // Получение всех транзакций (PEcoin + NFT) - ЛЕНИВАЯ ЗАГРУЗКА
  const fetchHistory = useCallback(
    async (walletAddress: string, beforeSignature?: string) => {
      console.log(`[EntityDetail] 🚀 fetchHistory STARTED для ${walletAddress}`)
      setHistoryError(null)
      setHistoryLoading(true) // Явно показываем загрузку
      
      try {
        console.log(`[EntityDetail] 📊 Загружаю историю для ${walletAddress}...`)
        
        // Загружаем PEcoin транзакции
        const requestBody: any = { walletAddress, limit: 10 }
        if (beforeSignature) {
          requestBody.beforeSignature = beforeSignature
        }

        console.log(`[EntityDetail] 🔄 Отправляю параллельные запросы...`)
        console.log(`[EntityDetail] 📦 Request body:`, requestBody)

        let allTransactions: any[] = []
        let nextSignature: string | undefined

        // Загружаем PEcoin транзакции с обработкой ошибок
        try {
          console.log(`[EntityDetail] 📤 Запрос PEcoin истории...`)
          const pecoinRes = await fetch("/api/pecoin-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          })
          
          console.log(`[EntityDetail] 📥 PEcoin ответ:`, {
            status: pecoinRes.status,
            ok: pecoinRes.ok,
            statusText: pecoinRes.statusText
          })

          if (pecoinRes.ok) {
            const pecoinData = await pecoinRes.json()
            console.log(`[EntityDetail] ✅ PEcoin данные получены:`, {
              transactionsCount: pecoinData.transactions?.length || 0,
              hasNextSignature: !!pecoinData.nextBeforeSignature
            })
            
            const pecoinTransactions = (pecoinData.transactions || []).map((tx: any) => ({
              ...tx,
              type: "Token" // Убеждаемся что тип правильный
            }))
            allTransactions.push(...pecoinTransactions)
            nextSignature = pecoinData.nextBeforeSignature
          } else {
            console.error(`[EntityDetail] ❌ Ошибка PEcoin API:`, pecoinRes.status, pecoinRes.statusText)
            const errorText = await pecoinRes.text()
            console.error(`[EntityDetail] ❌ PEcoin Error details:`, errorText)
          }
        } catch (pecoinError) {
          console.error(`[EntityDetail] ❌ Исключение при запросе PEcoin истории:`, pecoinError)
        }

        // Загружаем NFT транзакции с обработкой ошибок
        try {
          console.log(`[EntityDetail] 📤 Запрос NFT транзакций...`)
          const nftRes = await fetch("/api/nft-transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress, limit: 10 }),
          })
          
          console.log(`[EntityDetail] 📥 NFT ответ:`, {
            status: nftRes.status,
            ok: nftRes.ok,
            statusText: nftRes.statusText
          })

          if (nftRes.ok) {
            const nftData = await nftRes.json()
            console.log(`[EntityDetail] ✅ NFT данные получены:`, {
              transactionsCount: nftData.transactions?.length || 0
            })
            
            const nftTransactions = (nftData.transactions || []).map((tx: any) => ({
              ...tx,
              // Преобразуем NFT данные в формат совместимый с TransactionTable
              amount: 1, // NFT всегда 1 штука
              nftName: tx.nftName,
              sender: tx.from,
              receiver: tx.to,
              date: tx.date
            }))
            allTransactions.push(...nftTransactions)
          } else {
            console.error(`[EntityDetail] ❌ Ошибка NFT API:`, nftRes.status, nftRes.statusText)
            const errorText = await nftRes.text()
            console.error(`[EntityDetail] ❌ NFT Error details:`, errorText)
          }
        } catch (nftError) {
          console.error(`[EntityDetail] ❌ Исключение при запросе NFT транзакций:`, nftError)
        }

        console.log(`[EntityDetail] 📊 Всего транзакций загружено: ${allTransactions.length}`)

        // Сортируем все транзакции по дате (от новых к старым)
        allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        
        if (beforeSignature) {
          // Это запрос следующей страницы - добавляем к существующим транзакциям
          setTransactions(prev => [...prev, ...allTransactions])
        } else {
          // Это первый запрос - заменяем транзакции
          setTransactions(allTransactions)
        }
        
        // Сохраняем nextBeforeSignature для пагинации (используем от PEcoin API)
        setNextBeforeSignature(nextSignature)
        
        console.log(`[EntityDetail] ✅ fetchHistory завершён успешно для ${walletAddress}`)
        
      } catch (err) {
        console.error(`[EntityDetail] ❌ Критическая ошибка в fetchHistory:`, err)
        setHistoryError("История транзакций временно недоступна")
        if (!beforeSignature) {
          // Только очищаем если это первый запрос
          setTransactions([])
        }
      } finally {
        setHistoryLoading(false)
      }
    },
    []
  )

  // Автоматически загружаем историю и NFT при открытии детальной страницы участника
  useEffect(() => {
    console.log(`[EntityDetail] 🔧 Debug useEffect triggered:`, {
      hasEntity: !!entity,
      entityName: entity?.name,
      walletAddress: entity?.walletAddress,
      entityType: typeof entity,
      entityId: entity?.id
    })
    
    if (entity && entity.walletAddress && entity.walletAddress.trim() !== "") {
      console.log(`[EntityDetail] 🔍 Пользователь открыл детали ${entity.name}, загружаю историю и NFT...`)
      console.log(`[EntityDetail] 🎯 Wallet Address: ${entity.walletAddress}`)
      console.log(`[EntityDetail] 🎯 Entity ID: ${entity.id}`)
      
      // Очищаем предыдущие данные
      setTransactions([])
      setNfts([])
      setHistoryError(null)
      setNftsError(null)
      
      // Запускаем загрузку истории с дополнительным логированием
      console.log(`[EntityDetail] 🚀 Запускаю fetchHistory...`)
      fetchHistory(entity.walletAddress).then(() => {
        console.log(`[EntityDetail] ✅ История загружена для ${entity.name}`)
      }).catch((error) => {
        console.error(`[EntityDetail] ❌ Ошибка загрузки истории для ${entity.name}:`, error)
        setHistoryError("Не удалось загрузить историю транзакций")
      })
      
      // Запускаем загрузку NFT
      console.log(`[EntityDetail] 🚀 Запускаю fetchNFTCollection...`)
      fetchNFTCollection(entity.walletAddress).then(() => {
        console.log(`[EntityDetail] ✅ NFT загружены для ${entity.name}`)
      }).catch((error) => {
        console.error(`[EntityDetail] ❌ Ошибка загрузки NFT для ${entity.name}:`, error)
        setNftsError("Не удалось загрузить NFT коллекцию")
      })
    } else {
      console.log(`[EntityDetail] ⚠️ Нет entity или walletAddress для загрузки данных. Entity:`, entity)
      if (!entity) {
        console.log(`[EntityDetail] ⚠️ Entity отсутствует`)
      } else if (!entity.walletAddress) {
        console.log(`[EntityDetail] ⚠️ WalletAddress отсутствует в entity`)
      } else if (entity.walletAddress.trim() === "") {
        console.log(`[EntityDetail] ⚠️ WalletAddress пустой`)
      }
    }
  }, [entity?.walletAddress, entity?.id, fetchHistory, fetchNFTCollection])

  const loadMoreTransactions = async () => {
    if (!nextBeforeSignature || !entity?.walletAddress || isLoadingMore) return
    
    setIsLoadingMore(true)
    try {
      await fetchHistory(entity.walletAddress, nextBeforeSignature)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setLoading(true)
  }

  if (error) {
    return <ErrorOverlay message={error} />
  }

  if (!entity && !loading) {
    return <ErrorOverlay message="Entity not found" />
  }

  // Style variables based on entity type - updated for higher-contrast colors for teams
  const primaryColor = isTeam ? "#E63946" : "#6ABECD"
  const secondaryColor = isTeam ? "#F76E11" : "#3457D5"
  const bgGradient = isTeam ? "from-[#E63946] to-[#F76E11]" : "from-[#6ABECD] to-[#3457D5]"
  const borderColor = isTeam ? "border-[#E63946] dark:border-[#E63946]/80" : "border-[#6ABECD] dark:border-[#6ABECD]/50"
  const bgColor = isTeam ? "bg-[#F8F9FA] dark:bg-gray-800" : "bg-[#E8F7F9] dark:bg-[#E8F7F9]/10"
  const textColor = isTeam ? "text-[#E63946]" : "text-[#3457D5]"

  // Friendship-focused decorative elements for teams
  const TeamDecorations = () => (
    <div className="absolute -z-10 inset-0 overflow-hidden opacity-5">
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-[#E63946]"></div>
      <div className="absolute top-40 right-20 w-16 h-16 rounded-full bg-[#F76E11]"></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-[#F76E11]"></div>
      <div className="absolute top-1/3 right-1/3 w-12 h-12 rounded-full bg-[#E63946]"></div>
    </div>
  )

  return (
    <div className={`min-h-screen ${isTeam ? "bg-white dark:bg-gray-900" : "bg-white dark:bg-gray-900"}`}>
      {loading && <LoadingOverlay />}
      <AnimatedBackground />
      {isTeam && <TeamDecorations />}

      <header className={`py-6 px-4 md:px-8 border-b-4 ${isTeam ? "border-[#E63946] dark:border-[#E63946]/80" : borderColor}`}>
        <div className="container mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white font-medium text-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {entity && (
        <main className="container mx-auto py-8 px-4 md:px-8">
          <div className="max-w-4xl mx-auto space-y-10">
            {/* Top Information Block - Enhanced Design with Large Images */}
            <motion.section
              className={`camp-card ${borderColor} p-6 md:p-8 relative overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Team-specific decorative elements */}
              {isTeam && (
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#FFD166]/20 blur-xl"></div>
              )}
              
              {/* Mobile-First Layout with Large Image */}
              <div className="flex flex-col space-y-6">
                {/* Entity Header with Large Image */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                  {/* Large Entity Image/Logo - Main Focus */}
                  <div className="flex-shrink-0">
                    {entity.logo ? (
                      <motion.div
                        className="relative"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <img
                          src={entity.logo}
                          alt={entity.name + " logo"}
                          className="w-32 h-32 sm:w-40 sm:h-40 md:w-40 md:h-40 lg:w-48 lg:h-48 object-cover rounded-2xl md:rounded-3xl border-2 md:border-4 border-white dark:border-gray-700 shadow-xl md:shadow-2xl bg-white"
                        />
                        {/* Gradient overlay for better image integration */}
                        <div className={`absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br ${bgGradient} opacity-0 hover:opacity-20 transition-opacity duration-300`}></div>
                      </motion.div>
                    ) : (
                      <motion.div
                        className={`w-32 h-32 sm:w-40 sm:h-40 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-gradient-to-br ${bgGradient} rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl md:shadow-2xl`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        whileHover={{ scale: 1.05, rotate: 5 }}
                      >
                        {isTeam ? (
                          <Heart className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-white" />
                        ) : (
                          <Rocket className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-white" />
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Entity Info - Main Focus */}
                  <div className="flex-1 text-center md:text-left flex flex-col justify-center space-y-3">
                    <div>
                      <motion.h1 
                        className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold bg-gradient-to-r ${bgGradient} bg-clip-text text-transparent leading-tight`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      >
                        {entity.name}
                      </motion.h1>
                      
                      {/* Age for teams and startups - Right under the name */}
                      {(entity.ageDisplay || entity.ageRangeMin) && (
                        <motion.div
                          className="flex justify-center md:justify-start mt-2"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                        >
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md whitespace-nowrap">
                            {entity.ageRangeMin && entity.ageRangeMax 
                              ? (entity.ageRangeMin === entity.ageRangeMax 
                                  ? `${entity.ageRangeMin} y.o.` 
                                  : `${entity.ageRangeMin}-${entity.ageRangeMax} y.o.`)
                              : entity.ageDisplay || 'Age not set'}
                          </span>
                        </motion.div>
                      )}
                    </div>
                    
                    <motion.p 
                      className={`${isTeam ? "text-gray-800 dark:text-gray-200" : "text-gray-600 dark:text-gray-300"} text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    >
                      {entity.description}
                    </motion.p>
                  </div>

                  {/* PEcoin Balance - Right Side, Large & Prominent */}
                  <motion.div 
                    className="flex-shrink-0 flex flex-col items-center md:items-end text-center md:text-right justify-center"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex-shrink-0">
                        <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
                      </div>
                      <span className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                        {typeof entity.balance === 'number' ? entity.balance.toLocaleString() : "..."}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.section>

            {/* NFT Section */}
            <motion.section
              className={`camp-card ${borderColor} p-6 relative`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {isTeam && (
                <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-gradient-to-br from-[#FFD166]/20 to-[#FF6B6B]/20 blur-xl"></div>
              )}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <motion.div
                    className="mr-3"
                    whileHover={{ rotate: 10 }}
                    animate={isTeam ? { y: [0, -5, 0], rotate: [0, 5, 0] } : {}}
                    transition={isTeam ? { duration: 2, repeat: Number.POSITIVE_INFINITY } : {}}
                  >
                    <CampIcon type="nft" />
                  </motion.div>
                  <h2 className={`text-2xl font-display font-bold ${isTeam ? "text-[#E63946]" : ""}`}>NFTs Collection</h2>
                </div>
                {!nftsLoading && !nftsError && nfts.length > 0 && (
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${textColor}`}>
                    {nfts.length} NFT{nfts.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              <div className="px-2">
                {nftsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <motion.div
                      className={`w-8 h-8 border-4 border-t-transparent rounded-full ${isTeam ? "border-[#E63946]" : "border-[#6ABECD]"}`}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Загружаем NFT коллекцию...</span>
                  </div>
                ) : nftsError ? (
                  <div className="text-center py-10">
                    <div className="text-red-500 mb-2">{nftsError}</div>
                    <motion.button
                      onClick={() => entity?.walletAddress && fetchNFTCollection(entity.walletAddress)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        isTeam 
                          ? "border-[#E63946] text-[#E63946] hover:bg-[#E63946] hover:text-white" 
                          : "border-[#6ABECD] text-[#6ABECD] hover:bg-[#6ABECD] hover:text-white"
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Попробовать снова
                    </motion.button>
                  </div>
                ) : (
                  <NftGrid nfts={nfts} />
                )}
              </div>
            </motion.section>

            {/* Transaction History Section */}
            <motion.section
              className={`camp-card ${borderColor} p-6 relative`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {isTeam && (
                <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-gradient-to-br from-[#FF9E7D]/20 to-[#FFD166]/20 blur-xl"></div>
              )}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <motion.div
                    className="mr-3"
                    whileHover={{ scale: 1.1 }}
                    animate={isTeam ? { scale: [1, 1.1, 1], rotate: [0, 5, 0] } : {}}
                    transition={isTeam ? { duration: 3, repeat: Number.POSITIVE_INFINITY } : {}}
                  >
                    <CampIcon type="social" />
                  </motion.div>
                  <h2 className={`text-2xl font-display font-bold ${isTeam ? "text-[#E63946]" : ""}`}>Transaction History</h2>
                </div>
                {historyLoading && (
                  <div className="flex items-center">
                    <motion.div
                      className={`w-5 h-5 border-2 border-t-transparent rounded-full mr-2 ${isTeam ? "border-[#E63946]" : "border-[#6ABECD]"}`}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Загружаем...</span>
                  </div>
                )}
                {!historyLoading && !historyError && transactions.length > 0 && (
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${textColor}`}>
                    {transactions.length} транзакци{transactions.length === 1 ? 'я' : transactions.length < 5 ? 'и' : 'й'}
                  </div>
                )}
              </div>
              
              {historyError ? (
                <div className="text-center py-10">
                  <div className="text-red-500 mb-2">{historyError}</div>
                  <motion.button
                    onClick={() => entity?.walletAddress && fetchHistory(entity.walletAddress)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      isTeam 
                        ? "border-[#E63946] text-[#E63946] hover:bg-[#E63946] hover:text-white" 
                        : "border-[#6ABECD] text-[#6ABECD] hover:bg-[#6ABECD] hover:text-white"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Попробовать снова
                  </motion.button>
                </div>
              ) : historyLoading && transactions.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <motion.div
                    className={`w-8 h-8 border-4 border-t-transparent rounded-full ${isTeam ? "border-[#E63946]" : "border-[#6ABECD]"}`}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Загружаем историю транзакций...</span>
                </div>
              ) : (
                <div className="px-2">
                  <TransactionTable transactions={transactions} entityType={entityType} />
                </div>
              )}
              
              {/* Кнопка "Загрузить ещё" для пагинации */}
              {nextBeforeSignature && !historyError && (
                <div className="flex justify-center mt-6">
                  <motion.button
                    onClick={loadMoreTransactions}
                    disabled={isLoadingMore}
                    className={`px-6 py-3 rounded-xl border-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                      isTeam 
                        ? "border-[#E63946] text-[#E63946] hover:bg-[#E63946] hover:text-white dark:border-[#E63946]/80 dark:text-[#E63946]" 
                        : "border-[#6ABECD] text-[#6ABECD] hover:bg-[#6ABECD] hover:text-white dark:border-[#6ABECD]/50"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isLoadingMore ? "Загружается..." : "Загрузить ещё"}
                  </motion.button>
                </div>
              )}
            </motion.section>
          </div>
        </main>
      )}
    </div>
  )
}