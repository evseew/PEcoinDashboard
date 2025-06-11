"use client"

import Link from "next/link"
import { ArrowUpDown, Users, Rocket, Trophy, Target } from "lucide-react"
import { motion } from "framer-motion"
import { useTokenImageUrl } from "@/hooks/token-image-provider"
import { EntityListItem } from "./entity-list-item"

interface EntityListProps {
  title: string
  entities: any[]
  type: "teams" | "startups"
  currentSort: string
  onSort: (sortBy: string) => void
  icon?: "team" | "startup"
  compact?: boolean
  balances?: Record<string, number> // Объект с балансами для каждого кошелька
  balancesLoading?: boolean
}

export function EntityList({ title, entities, type, currentSort, onSort, icon, compact = false, balances, balancesLoading }: EntityListProps) {
  const handleSort = (sortBy: string) => {
    onSort(sortBy)
  }

  // Different styling based on entity type
  const isTeam = type === "teams"
  const borderColor = isTeam ? "border-[#FFEE98] dark:border-[#FFEE98]/50" : "border-[#6ABECD] dark:border-[#6ABECD]/50"

  const buttonBgActive = isTeam
    ? "bg-[#FFEE98] dark:bg-[#FFEE98]/80 border-[#FFEE98] dark:border-[#FFEE98]/80"
    : "bg-[#6ABECD] dark:bg-[#6ABECD]/80 border-[#6ABECD] dark:border-[#6ABECD]/80"

  const hoverBorder = isTeam
    ? "hover:border-[#FFEE98] dark:hover:border-[#FFEE98]/50"
    : "hover:border-[#6ABECD] dark:hover:border-[#6ABECD]/50"

  const iconBg = isTeam ? "bg-[#FFEE98] dark:bg-[#FFEE98]/80" : "bg-[#6ABECD] dark:bg-[#6ABECD]/80"

  const headerBg = isTeam
    ? "bg-gradient-to-r from-[#FFEE98]/20 to-[#FFA41B]/20 dark:from-[#FFEE98]/10 dark:to-[#FFA41B]/10"
    : "bg-gradient-to-r from-[#6ABECD]/20 to-[#3457D5]/20 dark:from-[#6ABECD]/10 dark:to-[#3457D5]/10"

  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  const pecoinImg = useTokenImageUrl(pecoinMint, "/images/pecoin.png")
  const alchemyApiKey = "VYK2v9vubZLxKwE9-ASUeQC6b1-zaVb1"

  return (
    <div className={`camp-card ${borderColor} p-4 h-full`}>
      <div className={`flex justify-between items-center mb-4 p-3 rounded-lg ${headerBg}`}>
        <div className="flex items-center">
          {isTeam ? (
            <div className="mr-2">
              <motion.div
                className="bg-gradient-to-br from-[#FFEE98] to-[#FFA41B] p-1.5 rounded-full"
                whileHover={{ rotate: 10 }}
              >
                <Users className="h-4 w-4 text-[#663F18]" />
              </motion.div>
            </div>
          ) : (
            <div className="mr-2">
              <motion.div
                className="bg-gradient-to-br from-[#6ABECD] to-[#3457D5] p-1.5 rounded-full"
                whileHover={{ rotate: 10 }}
              >
                <Rocket className="h-4 w-4 text-white" />
              </motion.div>
            </div>
          )}
          <h2 className="text-lg font-display font-bold">{title}</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleSort("name")}
            className={`text-xs px-2 py-1 rounded-md font-medium border transition-all duration-300 ${
              currentSort === "name"
                ? buttonBgActive
                : "bg-gray-100 dark:bg-gray-700 border-gray-100 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Name <ArrowUpDown className="inline h-2 w-2 ml-1" />
          </button>
          <button
            onClick={() => handleSort("balance")}
            className={`text-xs px-2 py-1 rounded-md font-medium border transition-all duration-300 ${
              currentSort === "balance"
                ? buttonBgActive
                : "bg-gray-100 dark:bg-gray-700 border-gray-100 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <span className="hidden sm:inline">Balance</span>
            <span className="sm:hidden">$</span>
            <ArrowUpDown className="inline h-2 w-2 ml-1" />
          </button>
        </div>
      </div>

      {entities.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">No {title.toLowerCase()} found</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {entities.map((entity, index) => (
            <EntityListItem
              key={entity.id}
              entity={entity}
              index={index}
              pecoinMint={pecoinMint}
              pecoinImg={pecoinImg}
              alchemyApiKey={alchemyApiKey}
              isTeam={isTeam}
              iconBg={iconBg}
              hoverBorder={hoverBorder}
              type={type}
              balance={balances?.[entity.wallet_address]}
              balanceLoading={balancesLoading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
