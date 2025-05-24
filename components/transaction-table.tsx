"use client"

import { motion } from "framer-motion"
import { CampIcon } from "@/components/camp-icons"
import { useTokenImageUrl } from "@/hooks/token-image-provider"

interface TransactionTableProps {
  transactions: any[]
  entityType?: string
}

export function TransactionTable({ transactions, entityType = "teams" }: TransactionTableProps) {
  const isTeam = entityType === "teams"
  const accentColor = isTeam ? "text-[#FF6B6B]" : "text-[#3457D5]"
  const bgColor = isTeam ? "bg-[#FFF0E5]" : "bg-[#E8F7F9]"
  const hoverBgColor = isTeam ? "hover:bg-[#FFF8F5]" : "hover:bg-gray-50"
  const darkHoverBgColor = isTeam ? "dark:hover:bg-[#3A2A22]" : "dark:hover:bg-gray-800"

  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  const pecoinImg = useTokenImageUrl(pecoinMint, "/images/pecoin.png")

  if (!transactions || transactions.length === 0) {
    return <div className="text-center py-10 text-gray-500 dark:text-gray-400">No transactions available</div>
  }

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-gray-100 dark:border-gray-700">
      <table className="w-full border-collapse">
        <thead>
          <tr className={`${bgColor} dark:bg-gray-800 border-b-2 border-gray-100 dark:border-gray-700`}>
            <th className="py-4 px-4 text-left font-display font-bold text-gray-600 dark:text-gray-300">#</th>
            <th className="py-4 px-4 text-left font-display font-bold text-gray-600 dark:text-gray-300">Sender</th>
            <th className="py-4 px-4 text-left font-display font-bold text-gray-600 dark:text-gray-300">Receiver</th>
            <th className="py-4 px-4 text-left font-display font-bold text-gray-600 dark:text-gray-300">Amount/NFT</th>
            <th className="py-4 px-4 text-left font-display font-medium text-sm text-gray-500 dark:text-gray-400">Date & Time</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <motion.tr
              key={transaction.signature || transaction.id || index}
              className={`border-b-2 border-gray-100 dark:border-gray-700 ${hoverBgColor} ${darkHoverBgColor}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{
                backgroundColor: isTeam ? "rgba(255, 107, 107, 0.05)" : "rgba(106, 190, 205, 0.1)",
                scale: isTeam ? 1.01 : 1,
              }}
            >
              <td className="py-4 px-4 font-medium">{index + 1}</td>
              <td className="py-4 px-4 font-medium">
                {transaction.senderDisplay || (transaction.sender?.length > 12 ? `${transaction.sender.slice(0, 4)}...${transaction.sender.slice(-4)}` : transaction.sender)}
              </td>
              <td className="py-4 px-4 font-medium">
                {transaction.receiverDisplay || (transaction.receiver?.length > 12 ? `${transaction.receiver.slice(0, 4)}...${transaction.receiver.slice(-4)}` : transaction.receiver)}
              </td>
              <td className="py-4 px-4">
                {(transaction.type === "Token" || transaction.type === "PEcoin") ? (
                  <div className="flex items-center">
                    <div className="mr-2 w-6 h-6">
                      <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
                    </div>
                    <span className={`font-bold ${accentColor}`}>{transaction.amount}</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="mr-2">
                      <CampIcon type="nft" size="sm" />
                    </div>
                    <span className="font-bold">{transaction.nftName}</span>
                  </div>
                )}
              </td>
              <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                {new Date(transaction.date).toLocaleDateString()} {new Date(transaction.date).toLocaleTimeString()}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
