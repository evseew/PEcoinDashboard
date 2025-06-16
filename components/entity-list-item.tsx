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
      whileHover={{ scale: 1.01, y: -1 }}
      key={entity.id}
    >
      <Link href={`/${type.endsWith("s") ? type : `${type}s`}/${entity.id}`}>
        <div
          className={`flex items-center p-5 min-h-[72px] rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${hoverBorder} transition-all duration-300 hover:shadow-sm group`}
        >
          <div
            className={`w-6 h-6 flex items-center justify-center ${iconBg} rounded-full mr-3 font-bold text-xs`}
          >
            {index + 1}
          </div>

          {isTeam ? (
            <div className="h-12 w-12 bg-gradient-to-br from-[#FFEED8] to-[#FFD8BE] rounded-md flex items-center justify-center mr-4 overflow-hidden">
              {entity.logo ? (
                <img
                  src={entity.logo || "/placeholder.svg"}
                  alt={`${entity.name} logo`}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <Users className="h-6 w-6 text-[#663F18]" />
              )}
            </div>
          ) : (
            <div className="h-12 w-12 bg-gradient-to-br from-[#E8F7F9] to-[#D8F2F9] rounded-md flex items-center justify-center mr-4 overflow-hidden">
              {entity.logo ? (
                <img
                  src={entity.logo || "/placeholder.svg"}
                  alt={`${entity.name} logo`}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <Rocket className="h-6 w-6 text-[#3457D5]" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-lg md:text-xl truncate group-hover:underline">{entity.name}</h3>
            {entity.tagline && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{entity.tagline}</p>
            )}
          </div>

          {/* Возраст для команд */}
          {isTeam && (entity.age_display || entity.age_range_min) && (
            <div className="mr-3">
              <AgeDisplay
                ageDisplay={entity.age_display}
                ageRangeMin={entity.age_range_min}
                ageRangeMax={entity.age_range_max}
                size="sm"
                showIcon={true}
              />
            </div>
          )}

          <div
            className={`flex items-center ml-auto min-w-[70px] justify-end ${isTeam ? "bg-[#FFF8E8]" : "bg-[#E8F7F9]"} dark:bg-gray-700 pl-2 pr-3 py-2 rounded-full`}
            title={`PEcoin баланс: ${balance?.toLocaleString() || 0}`}
          >
            <div className="w-5 h-5 mr-1 flex-shrink-0">
              <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
            </div>
            <span className="font-bold text-base tabular-nums">
              {balanceLoading ? "..." : (balance !== undefined ? balance.toLocaleString() : "0")}
            </span>
          </div>

          {/* NFT счетчик для команд (кубок) */}
          {isTeam && (
            <motion.div 
              className="ml-3 flex items-center bg-[#FFE4B5] dark:bg-[#FFE4B5]/20 px-2 py-1 rounded-full min-w-[50px] justify-center"
              whileHover={{ scale: 1.05 }}
              title={`${nftCount || 0} NFT в коллекции`}
            >
              <Trophy className="h-4 w-4 text-[#FFA41B] mr-1" />
              <span className="text-sm font-bold text-[#FFA41B] tabular-nums">
                {nftLoading ? "..." : (nftCount || 0)}
              </span>
            </motion.div>
          )}

          {/* NFT счетчик для стартапов (цель) */}
          {!isTeam && (
            <motion.div 
              className="ml-3 flex items-center bg-[#D8F2F9] dark:bg-[#D8F2F9]/20 px-2 py-1 rounded-full min-w-[50px] justify-center"
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
      </Link>
    </motion.div>
  )
} 