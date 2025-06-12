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

  // Получение транзакций по всем PEcoin token accounts (убираем старую NFT логику)
  const fetchHistory = useCallback(
    async (walletAddress: string, beforeSignature?: string) => {
      setHistoryError(null)
      try {
        // Новый API принимает walletAddress и сам найдет все PEcoin token accounts
        const requestBody: any = { walletAddress, limit: 10 }
        if (beforeSignature) {
          requestBody.beforeSignature = beforeSignature
        }

        const res = await fetch("/api/pecoin-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })
        
        if (res.ok) {
          const data = await res.json()
          const transactions = data.transactions || []
          
          if (beforeSignature) {
            // Это запрос следующей страницы - добавляем к существующим транзакциям
            setTransactions(prev => [...prev, ...transactions])
          } else {
            // Это первый запрос - заменяем транзакции
            setTransactions(transactions)
          }
          
          // Убираем старую логику NFT из транзакций
          // setNfts(prev => beforeSignature ? [...prev, ...enrichedTransactions.filter((tx: any) => tx.type === "NFT")] : enrichedTransactions.filter((tx: any) => tx.type === "NFT"))
          
          // Сохраняем nextBeforeSignature для пагинации
          setNextBeforeSignature(data.nextBeforeSignature)
        } else {
          throw new Error(`HTTP ${res.status}`)
        }
      } catch (err) {
        console.error("Error fetching history:", err)
        setHistoryError("История транзакций временно недоступна")
        if (!beforeSignature) {
          // Только очищаем если это первый запрос
          setTransactions([])
        }
      }
    },
    []
  )

  useEffect(() => {
    if (entity && entity.walletAddress) {
      fetchHistory(entity.walletAddress)
      fetchNFTCollection(entity.walletAddress)
    }
  }, [entity, fetchHistory, fetchNFTCollection])

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
            href="/"
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
            {/* Top Information Block - Simplified */}
            <motion.section
              className={`camp-card ${borderColor} p-6 relative overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Team-specific decorative elements */}
              {isTeam && (
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#FFD166]/20 blur-xl"></div>
              )}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    {entity.logo ? (
                      <div className="mr-3">
                        <img
                          src={entity.logo}
                          alt={entity.name + " logo"}
                          className="h-16 w-16 object-cover rounded-full border-2 border-gray-200 dark:border-gray-700 bg-white"
                        />
                      </div>
                    ) : isTeam ? (
                      <div className="mr-3">
                        <motion.div
                          className={`bg-gradient-to-br ${bgGradient} p-3 rounded-full`}
                          whileHover={{ rotate: 10, scale: 1.1 }}
                        >
                          <Heart className="h-6 w-6 text-white" />
                        </motion.div>
                      </div>
                    ) : (
                      <div className="mr-3">
                        <motion.div
                          className={`bg-gradient-to-br ${bgGradient} p-3 rounded-full`}
                          whileHover={{ rotate: 10 }}
                        >
                          <Rocket className="h-6 w-6 text-white" />
                        </motion.div>
                      </div>
                    )}
                    <h1 className={`text-3xl md:text-4xl font-display font-bold bg-gradient-to-r ${bgGradient} bg-clip-text text-transparent`}>
                      {entity.name}
                    </h1>
                  </div>
                  <p className={`${isTeam ? "text-gray-800 dark:text-gray-200" : "text-gray-600 dark:text-gray-300"} text-lg`}>
                    {entity.description}
                  </p>
                </div>
                <div className={`neomorphic p-6 rounded-xl flex items-center ${bgColor}`}>
                  <motion.div
                    className="mr-4"
                    whileHover={{ rotate: 10 }}
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 2, 0] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
                  >
                    <div className="w-12 h-12">
                      <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
                    </div>
                  </motion.div>
                  <span className={`text-4xl font-display font-bold bg-gradient-to-r ${bgGradient} bg-clip-text text-transparent`}>
                    {typeof entity.balance === 'number' ? entity.balance.toLocaleString() : "..."}
                  </span>
                </div>
              </div>
              {/* Team-specific decorative elements */}
              {isTeam && (
                <div className="mt-6 flex justify-center">
                  <div className="flex space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FFD166] flex items-center justify-center"
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, delay: i * 0.3, repeat: Number.POSITIVE_INFINITY }}
                      >
                        <Sparkles className="h-4 w-4 text-white" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
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
              <div className="flex items-center mb-6">
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
              {historyError ? (
                <div className="text-red-500 mb-4">{historyError}</div>
              ) : null}
              <TransactionTable transactions={transactions} entityType={entityType} />
              {/* Кнопка "Загрузить ещё" для пагинации */}
              {nextBeforeSignature && (
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