"use client"


import Link from "next/link"
import { ArrowLeft, Heart, Rocket } from "lucide-react"
import { LoadingOverlay } from "@/components/loading-overlay"
import { ErrorOverlay } from "@/components/error-overlay"
import { TransactionTable } from "@/components/transaction-table"
import { NftGrid } from "@/components/nft-grid"
import { ThemeToggle } from "@/components/theme-toggle"
import { CampIcon } from "@/components/camp-icons"
import { AnimatedBackground } from "@/components/animated-background"
import { motion } from "framer-motion"
import { useTokenImageUrl } from "@/hooks/token-image-provider"
import { useEntityDetail } from "@/hooks/use-entity-detail"

interface EntityDetailOptimizedProps {
  entityType: string
  entityId: string
  // ✅ ОПЦИОНАЛЬНО: Предзагруженные данные для быстрого отображения (обновляются автоматически)
  preloadedNFTCount?: number
  preloadedNFTs?: any[]
}

export function EntityDetailOptimized({ 
  entityType, 
  entityId,
  preloadedNFTCount = 0,
  preloadedNFTs = []
}: EntityDetailOptimizedProps) {
  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  const pecoinImg = useTokenImageUrl(pecoinMint, "/images/pecoin.png")
  
  // ✅ ИСПОЛЬЗУЕМ новый оптимизированный хук
  const {
    entity,
    loading,
    error,
    nextBeforeSignature,
    loadMoreTransactions
  } = useEntityDetail({
    entityType,
    entityId,
    preloadedNFTCount,
    preloadedNFTs
  })





  const isTeam = entityType === "teams" || entityType === "team"

  if (error) {
    return <ErrorOverlay message={error} />
  }

  if (!entity && !loading) {
    return <ErrorOverlay message="Entity not found" />
  }

  // Style variables based on entity type
  const primaryColor = isTeam ? "#E63946" : "#6ABECD"
  const secondaryColor = isTeam ? "#F76E11" : "#3457D5"
  const bgGradient = isTeam ? "from-[#E63946] to-[#F76E11]" : "from-[#6ABECD] to-[#3457D5]"
  const borderColor = isTeam ? "border-[#E63946] dark:border-[#E63946]/80" : "border-[#6ABECD] dark:border-[#6ABECD]/50"
  const bgColor = isTeam ? "bg-[#F8F9FA] dark:bg-gray-800" : "bg-[#E8F7F9] dark:bg-[#E8F7F9]/10"
  const textColor = isTeam ? "text-[#E63946]" : "text-[#3457D5]"

  // Decorative elements for teams
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
            {/* ✅ УПРОЩЕННЫЙ Entity Info Block */}
            <motion.section
              className={`camp-card ${borderColor} p-6 md:p-8 relative overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {isTeam && (
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#FFD166]/20 blur-xl"></div>
              )}
              
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Entity Image/Logo */}
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
                        className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-cover rounded-2xl md:rounded-3xl border-2 md:border-4 border-white dark:border-gray-700 shadow-xl bg-white"
                      />
                      <div className={`absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br ${bgGradient} opacity-0 hover:opacity-20 transition-opacity duration-300`}></div>
                    </motion.div>
                  ) : (
                    <motion.div
                      className={`w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-gradient-to-br ${bgGradient} rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6 }}
                      whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                      {isTeam ? (
                        <Heart className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-white" />
                      ) : (
                        <Rocket className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-white" />
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Entity Info */}
                <div className="flex-1 text-center md:text-left">
                  <motion.h1 
                    className={`text-3xl md:text-4xl lg:text-5xl font-display font-bold bg-gradient-to-r ${bgGradient} bg-clip-text text-transparent leading-tight`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    {entity.name}
                  </motion.h1>
                  
                  {/* Age display */}
                  {(entity.ageDisplay || entity.ageRangeMin) && (
                    <motion.div
                      className="flex justify-center md:justify-start mt-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    >
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                        {entity.ageRangeMin && entity.ageRangeMax 
                          ? (entity.ageRangeMin === entity.ageRangeMax 
                              ? `${entity.ageRangeMin} y.o.` 
                              : `${entity.ageRangeMin}-${entity.ageRangeMax} y.o.`)
                          : entity.ageDisplay || 'Age not set'}
                      </span>
                    </motion.div>
                  )}
                  
                  <motion.p 
                    className="text-gray-600 dark:text-gray-300 text-base md:text-lg leading-relaxed mt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    {entity.description}
                  </motion.p>
                </div>

                {/* ✅ РЕАКТИВНЫЙ PEcoin Balance */}
                <motion.div 
                  className="flex-shrink-0 flex flex-col items-center md:items-end text-center md:text-right"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
                      <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
                    </div>
                    <span className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                      {entity.balance.toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.section>

            {/* ✅ ОПТИМИЗИРОВАННАЯ NFT Section */}
            <motion.section
              className={`camp-card ${borderColor} p-6 relative`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <motion.div className="mr-3" whileHover={{ rotate: 10 }}>
                    <CampIcon type="nft" />
                  </motion.div>
                  <h2 className={`text-2xl font-display font-bold ${isTeam ? "text-[#E63946]" : ""}`}>NFTs Collection</h2>
                </div>
                
                {/* ✅ ПОКАЗЫВАЕМ актуальное количество NFT */}
                {entity.nftCount > 0 && (
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${textColor}`}>
                    {entity.nftCount} NFT{entity.nftCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              <div className="px-2">
                {entity.nftsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <motion.div
                      className={`w-8 h-8 border-4 border-t-transparent rounded-full ${isTeam ? "border-[#E63946]" : "border-[#6ABECD]"}`}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Загружаем NFT коллекцию...</span>
                  </div>
                ) : entity.nftCount === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">Нет NFT в коллекции</p>
                  </div>
                ) : (
                  <div>
                    {/* ✅ АВТОМАТИЧЕСКОЕ отображение NFT */}
                    {entity.nfts.length > 0 ? (
                      <NftGrid nfts={entity.nfts} />
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">
                          {entity.nftCount > 0 ? "Загрузка NFT данных..." : "Нет NFT в коллекции"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.section>

            {/* ✅ УПРОЩЕННАЯ Transaction History Section */}
            <motion.section
              className={`camp-card ${borderColor} p-6 relative`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <motion.div className="mr-3" whileHover={{ scale: 1.1 }}>
                    <CampIcon type="social" />
                  </motion.div>
                  <h2 className={`text-2xl font-display font-bold ${isTeam ? "text-[#E63946]" : ""}`}>Transaction History</h2>
                </div>
                
                {entity.transactionsLoading && (
                  <div className="flex items-center">
                    <motion.div
                      className={`w-5 h-5 border-2 border-t-transparent rounded-full mr-2 ${isTeam ? "border-[#E63946]" : "border-[#6ABECD]"}`}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Загружаем...</span>
                  </div>
                )}
                
                {!entity.transactionsLoading && entity.transactions.length > 0 && (
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${textColor}`}>
                    {entity.transactions.length} транзакци{entity.transactions.length === 1 ? 'я' : entity.transactions.length < 5 ? 'и' : 'й'}
                  </div>
                )}
              </div>
              
              {entity.transactionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <motion.div
                    className={`w-8 h-8 border-4 border-t-transparent rounded-full ${isTeam ? "border-[#E63946]" : "border-[#6ABECD]"}`}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Загружаем историю транзакций...</span>
                </div>
              ) : entity.transactions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 dark:text-gray-400">Нет транзакций</p>
                </div>
              ) : (
                <>
                  <TransactionTable transactions={entity.transactions} entityType={entityType} />
                  
                  {/* Load more button */}
                  {nextBeforeSignature && (
                    <div className="flex justify-center mt-6">
                      <motion.button
                        onClick={loadMoreTransactions}
                        disabled={entity.transactionsLoading}
                        className={`px-6 py-3 rounded-xl border-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                          isTeam 
                            ? "border-[#E63946] text-[#E63946] hover:bg-[#E63946] hover:text-white" 
                            : "border-[#6ABECD] text-[#6ABECD] hover:bg-[#6ABECD] hover:text-white"
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {entity.transactionsLoading ? "Загружается..." : "Загрузить ещё"}
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </motion.section>
          </div>
        </main>
      )}
    </div>
  )
} 