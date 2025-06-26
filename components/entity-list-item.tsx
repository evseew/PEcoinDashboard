import Link from "next/link"
import { motion } from "framer-motion"
import { Users, Rocket, Trophy, Target } from "lucide-react"
import { useNftCount } from "@/hooks/use-nft-count"
import { AgeDisplay } from "@/components/age-display"

interface EntityListItemProps {
  entity: any
  index: number
  pecoinMint: string
  pecoinImg: string
  alchemyApiKey: string
  isTeam: boolean
  iconBg: string
  hoverBorder: string
  type: string
  balance?: number // Теперь баланс приходит как готовый пропс
  balanceLoading?: boolean
}

export function EntityListItem({ entity, index, pecoinMint, pecoinImg, alchemyApiKey, isTeam, iconBg, hoverBorder, type, balance, balanceLoading }: EntityListItemProps) {
  // Убираем индивидуальную загрузку баланса - теперь он приходит готовым через пропсы
  const { nftCount, loading: nftLoading } = useNftCount(entity.wallet_address)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ scale: 1.02, y: -2 }}
      key={entity.id}
    >
      <Link href={`/${type.endsWith("s") ? type : `${type}s`}/${entity.id}`}>
        <div
          className={`flex items-center p-4 sm:p-5 min-h-[80px] sm:min-h-[88px] rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${hoverBorder} transition-all duration-300 hover:shadow-lg group relative overflow-hidden`}
        >
          {/* Background gradient effect on hover */}
          <div className={`absolute inset-0 ${isTeam ? "bg-gradient-to-r from-[#E63946]/5 to-[#F76E11]/5" : "bg-gradient-to-r from-[#6ABECD]/5 to-[#3457D5]/5"} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
          
          {/* Position indicator */}
          <div
            className={`w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full mr-3 sm:mr-4 font-medium text-xs z-10 opacity-60`}
          >
            {index + 1}
          </div>

          {/* Entity Logo - Enhanced with larger size */}
          <motion.div 
            className="relative mr-3 sm:mr-4 z-10"
            whileHover={{ scale: 1.05 }}
          >
            {isTeam ? (
              <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 bg-gradient-to-br from-[#FFEED8] to-[#FFD8BE] rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden shadow-md relative">
                {entity.logo ? (
                  <>
                    <img
                      src={entity.logo || "/placeholder.svg"}
                      alt={`${entity.name} logo`}
                      className="h-full w-full object-cover rounded-xl sm:rounded-2xl"
                    />
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#E63946]/20 to-[#F76E11]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl sm:rounded-2xl"></div>
                  </>
                ) : (
                  <Users className="h-7 w-7 sm:h-8 sm:w-8 text-[#663F18]" />
                )}
              </div>
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 bg-gradient-to-br from-[#E8F7F9] to-[#D8F2F9] rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden shadow-md relative">
                {entity.logo ? (
                  <>
                    <img
                      src={entity.logo || "/placeholder.svg"}
                      alt={`${entity.name} logo`}
                      className="h-full w-full object-cover rounded-xl sm:rounded-2xl"
                    />
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6ABECD]/20 to-[#3457D5]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl sm:rounded-2xl"></div>
                  </>
                ) : (
                  <Rocket className="h-7 w-7 sm:h-8 sm:w-8 text-[#3457D5]" />
                )}
              </div>
            )}
          </motion.div>

          {/* Entity Info */}
          <div className="flex-1 min-w-0 z-10">
            <div className="flex flex-col gap-1">
              {/* Название для команд и стартапов */}
              {isTeam ? (
                <>
                  {/* Команды: название и возраст на разных строках */}
                  <h3 className={`font-display font-bold text-base sm:text-lg md:text-xl truncate group-hover:underline transition-colors duration-300 group-hover:text-[#E63946]`}>
                    {entity.name}
                  </h3>
                  
                  {/* Age display for teams - под названием */}
                  {(entity.age_display || entity.age_range_min) && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md flex-shrink-0 whitespace-nowrap w-fit">
                      {entity.age_range_min && entity.age_range_max 
                        ? (entity.age_range_min === entity.age_range_max 
                            ? `${entity.age_range_min} y.o.` 
                            : `${entity.age_range_min}-${entity.age_range_max} y.o.`)
                        : entity.age_display || 'Age not set'}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {/* Стартапы: название и возраст в одной строке */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-display font-bold text-base sm:text-lg md:text-xl truncate group-hover:underline transition-colors duration-300 group-hover:text-[#3457D5] flex-shrink-0`}>
                      {entity.name}
                    </h3>
                    
                    {/* Age display for startups - в одной строке с названием */}
                    {(entity.age_display || entity.age_range_min) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md flex-shrink-0 whitespace-nowrap">
                        {entity.age_range_min && entity.age_range_max 
                          ? (entity.age_range_min === entity.age_range_max 
                              ? `${entity.age_range_min} y.o.` 
                              : `${entity.age_range_min}-${entity.age_range_max} y.o.`)
                          : entity.age_display || 'Age not set'}
                      </span>
                    )}
                  </div>
                </>
              )}
              
              {/* Description/tagline if available */}
              {entity.description && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate leading-relaxed">
                  {entity.description.length > 50 ? `${entity.description.substring(0, 50)}...` : entity.description}
                </p>
              )}
            </div>
          </div>

                     {/* Stats section - Clean design */}
           <div className="flex items-center gap-6 ml-2 sm:ml-auto z-10">
             {/* PEcoin Balance Block - Clean */}
             <motion.div
               className="flex items-center gap-2"
               title={`PEcoin баланс: ${balance?.toLocaleString() || 0}`}
               whileHover={{ scale: 1.05 }}
             >
               <div className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                 <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
               </div>
               <span className="font-bold text-base sm:text-lg md:text-xl tabular-nums text-gray-900 dark:text-gray-100">
                 {balanceLoading ? "..." : (balance !== undefined ? balance.toLocaleString() : "0")}
               </span>
             </motion.div>

             {/* NFT Count Block - Clean */}
             {isTeam ? (
               <motion.div 
                 className="flex items-center bg-gradient-to-r from-[#FFE4B5] to-[#FFD700] dark:bg-[#FFE4B5]/20 px-2.5 py-1.5 rounded-full min-w-[50px] justify-center shadow-sm border border-[#FFA41B]/30"
                 whileHover={{ scale: 1.05 }}
                 title={`${nftCount || 0} NFT в коллекции`}
               >
                 <Trophy className="h-4 w-4 text-[#FFA41B] mr-1" />
                 <span className="text-sm font-bold text-[#FFA41B] tabular-nums">
                   {nftLoading ? "..." : (nftCount || 0)}
                 </span>
               </motion.div>
             ) : (
               <motion.div 
                 className="flex items-center bg-gradient-to-r from-[#D8F2F9] to-[#B8E6F0] dark:bg-[#D8F2F9]/20 px-2.5 py-1.5 rounded-full min-w-[50px] justify-center shadow-sm border border-[#3457D5]/30"
                 whileHover={{ scale: 1.05 }}
                 title={`${nftCount || 0} NFT в коллекции`}
               >
                 <Target className="h-4 w-4 text-[#3457D5] mr-1" />
                 <span className="text-sm font-bold text-[#3457D5] tabular-nums">
                   {nftLoading ? "..." : (nftCount || 0)}
                 </span>
               </motion.div>
             )}
           </div>
        </div>
      </Link>
    </motion.div>
  )
} 