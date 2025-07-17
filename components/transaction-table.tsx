"use client"

import { motion } from "framer-motion"
import { CampIcon } from "@/components/camp-icons"
import { useTokenImageUrl } from "@/hooks/token-image-provider"
import { useMobile } from "@/hooks/use-mobile"
import { MobileTransactionList } from "@/components/mobile-transaction-list"
import { Users, Rocket, UserCog } from "lucide-react"

interface TransactionTableProps {
  transactions: any[]
  entityType?: string
}

// Компонент для отображения участника с иконкой типа
function ParticipantDisplay({ 
  name, 
  address, 
  info, 
  isTeam 
}: { 
  name: string
  address: string
  info?: { name: string, type: 'team' | 'startup' | 'staff', shortAddress: string } | null
  isTeam: boolean 
}) {
  const accentColor = isTeam ? "text-[#FF6B6B]" : "text-[#3457D5]"
  
  if (info) {
    const TypeIcon = info.type === 'team' ? Users : info.type === 'startup' ? Rocket : UserCog
    const typeColorClass = info.type === 'team' ? 'text-red-500' : info.type === 'startup' ? 'text-blue-500' : 'text-green-500'
    
    return (
      <div className="flex items-center gap-2">
        <TypeIcon className={`w-4 h-4 ${typeColorClass}`} />
        <span className={`font-medium ${accentColor}`} title={info.shortAddress}>
          {info.name}
        </span>
      </div>
    )
  }
  
  // Fallback на сокращенный адрес
  return (
    <span className="font-medium text-gray-600 dark:text-gray-400">
      {name}
    </span>
  )
}

export function TransactionTable({ transactions, entityType = "teams" }: TransactionTableProps) {
  const isMobile = useMobile()
  
  // ✅ ВРЕМЕННО: Всегда показываем новую версию для тестирования
  return <MobileTransactionList transactions={transactions} entityType={entityType} />
  
  // ✅ АДАПТИВНЫЙ ДИЗАЙН: Мобильная версия (закомментировано для тестирования)
  // if (isMobile) {
  //   return <MobileTransactionList transactions={transactions} entityType={entityType} />
  // }

  // ✅ ДЕСКТОПНАЯ ВЕРСИЯ: Существующая таблица
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
            <th className="py-4 px-4 text-left font-display font-bold text-gray-600 dark:text-gray-300">Comment</th>
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
              <td className="py-4 px-4">
                <ParticipantDisplay 
                  name={transaction.senderName || transaction.sender} 
                  address={transaction.sender}
                  info={transaction.senderInfo}
                  isTeam={isTeam}
                />
              </td>
              <td className="py-4 px-4">
                <ParticipantDisplay 
                  name={transaction.receiverName || transaction.receiver} 
                  address={transaction.receiver}
                  info={transaction.receiverInfo}
                  isTeam={isTeam}
                />
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
              <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                {transaction.memo ? (
                  <span className="italic" title={transaction.memo}>
                    {transaction.memo.length > 30 ? `${transaction.memo.substring(0, 30)}...` : transaction.memo}
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">—</span>
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
