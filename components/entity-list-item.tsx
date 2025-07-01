"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Users, Rocket, Trophy, Target, Heart, Sparkles } from "lucide-react"
import { AgeDisplay } from "@/components/age-display"

interface EntityListItemProps {
  entity: any
  entityType: "teams" | "startups"
  balance: number
  index: number
  getNFTCount: (walletAddress: string) => number
  // ✅ ОПЦИОНАЛЬНО: Для передачи полных NFT данных в EntityDetail (на главной странице не используется)
  getNFTsForWallet?: (walletAddress: string) => any[]
}

// ✅ Функция для форматирования больших чисел
function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return num.toLocaleString()
}

export function EntityListItem({ 
  entity, 
  entityType, 
  balance, 
  index, 
  getNFTCount,
  getNFTsForWallet 
}: EntityListItemProps) {
  const isTeam = entityType === "teams"
  const nftCount = getNFTCount(entity.wallet_address)
  
  // ✅ ПОЛУЧАЕМ предзагруженные NFT данные (на главной странице будет пустой массив - это нормально)
  const preloadedNFTs = getNFTsForWallet ? getNFTsForWallet(entity.wallet_address) : []
  
  const entityDetailParams = new URLSearchParams({
    nftCount: nftCount.toString(),
    hasNFTs: (nftCount > 0).toString()
  })

  const primaryColor = isTeam ? "#E63946" : "#6ABECD"
  const secondaryColor = isTeam ? "#F76E11" : "#3457D5"
  const bgGradient = isTeam ? "from-[#E63946] to-[#F76E11]" : "from-[#6ABECD] to-[#3457D5]"
  const borderColor = isTeam ? "border-[#E63946] dark:border-[#E63946]/80" : "border-[#6ABECD] dark:border-[#6ABECD]/50"
  const bgColor = isTeam ? "bg-[#F8F9FA] dark:bg-gray-800" : "bg-[#E8F7F9] dark:bg-[#E8F7F9]/10"
  const textColor = isTeam ? "text-[#E63946]" : "text-[#3457D5]"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group"
    >
      <Link 
        href={`/${entityType}/${entity.id}?${entityDetailParams.toString()}`}
        onClick={() => {
          // ✅ СОХРАНЯЕМ предзагруженные NFT данные (если есть) для быстрого отображения в EntityDetail
          if (preloadedNFTs.length > 0) {
            sessionStorage.setItem(
              `nft-data-${entity.wallet_address}`, 
              JSON.stringify(preloadedNFTs)
            )
          }
          // На главной странице preloadedNFTs будет пустой - это нормально, EntityDetail загрузит данные самостоятельно
        }}
      >
        <div className={`camp-card hover:border-opacity-100 transition-all duration-300 ${borderColor} group-hover:shadow-xl group-hover:shadow-${isTeam ? '[#E63946]' : '[#6ABECD]'}/10`}>
          <div className="flex items-center p-3 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                {entity.logo ? (
                  <div className="relative">
                    <img
                      src={entity.logo}
                      alt={entity.name + " logo"}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-2xl border-2 border-white dark:border-gray-700 shadow-lg"
                    />
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${bgGradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
                  </div>
                ) : (
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${bgGradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {isTeam ? (
                      <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    ) : (
                      <Rocket className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <h3 className="text-sm sm:text-base md:text-lg font-display font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-[var(--primary)] group-hover:to-[var(--secondary)] transition-all duration-300"
                      style={{ '--primary': primaryColor, '--secondary': secondaryColor } as any}
                      title={entity.name}>
                    {entity.name}
                  </h3>
                  <div className="flex-shrink-0 self-start sm:self-auto">
                    <AgeDisplay 
                      ageRangeMin={entity.age_range_min} 
                      ageRangeMax={entity.age_range_max} 
                      ageDisplay={entity.age_display} 
                    />
                  </div>
                </div>
                {!isTeam && entity.description && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {entity.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 ml-auto pl-2 sm:pl-4 flex-shrink-0">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <div className="w-3 h-3 sm:w-5 sm:h-5">
                  <img src="/images/pecoin.png" alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
                </div>
                <div 
                  className="text-xs sm:text-sm md:text-base font-display font-bold text-gray-900 dark:text-gray-100 tabular-nums"
                  title={`${balance.toLocaleString()} PEcoin`}
                >
                  {formatLargeNumber(balance)}
                </div>
              </div>

              {isTeam && (
                <motion.div 
                  className="flex items-center bg-[#FFE4B5] dark:bg-[#FFE4B5]/20 px-1 py-0.5 sm:px-2 sm:py-1 rounded-full min-w-[32px] max-w-[50px] sm:min-w-[40px] sm:max-w-[60px] justify-center"
                  whileHover={{ scale: 1.05 }}
                  title={`${nftCount || 0} NFT в коллекции`}
                >
                  <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#FFA41B] mr-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-[#FFA41B] tabular-nums truncate">
                    {nftCount || 0}
                  </span>
                </motion.div>
              )}

              {!isTeam && (
                <motion.div 
                  className="flex items-center bg-[#D8F2F9] dark:bg-[#D8F2F9]/20 px-1 py-0.5 sm:px-2 sm:py-1 rounded-full min-w-[32px] max-w-[50px] sm:min-w-[40px] sm:max-w-[60px] justify-center"
                  whileHover={{ scale: 1.05 }}
                  title={`${nftCount || 0} NFT в коллекции`}
                >
                  <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#3457D5] mr-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-[#3457D5] tabular-nums truncate">
                    {nftCount || 0}
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
} 