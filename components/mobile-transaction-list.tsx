"use client"

import { motion } from "framer-motion"
import { useTokenImageUrl } from "@/hooks/token-image-provider"
import { Users, Rocket, UserCog } from "lucide-react"

interface Transaction {
  signature: string
  type: "Token" | "PEcoin" | "NFT_TRANSFER" | "NFT_MINT" | "NFT_BURN"
  action?: "sent" | "received" | "other"
  amount?: number
  nftName?: string
  date: string
  sender: string
  receiver: string
  senderName?: string
  receiverName?: string
  senderInfo?: any
  receiverInfo?: any
  memo?: string
}

interface TransactionGroup {
  date: string
  displayDate: string
  transactions: Transaction[]
}

interface MobileTransactionListProps {
  transactions: Transaction[]
  entityType?: string
}

// Функция группировки транзакций по дням
function groupTransactionsByDate(transactions: Transaction[]): TransactionGroup[] {
  const groups: { [key: string]: Transaction[] } = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  transactions.forEach(tx => {
    const txDate = new Date(tx.date)
    const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate())
    
    let key: string
    let displayDate: string

    if (txDay.getTime() === today.getTime()) {
      key = 'today'
      displayDate = 'Сегодня'
    } else if (txDay.getTime() === yesterday.getTime()) {
      key = 'yesterday'
      displayDate = 'Вчера'
    } else {
      key = txDay.toISOString().split('T')[0]
      displayDate = txDay.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    }

    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(tx)
  })

  // Сортируем группы по дате (новые сначала)
  const sortedGroups = Object.entries(groups)
    .map(([date, transactions]) => ({
      date,
      displayDate: date === 'today' ? 'Сегодня' : 
                  date === 'yesterday' ? 'Вчера' : 
                  new Date(date).toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  }),
      transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }))
    .sort((a, b) => {
      if (a.date === 'today') return -1
      if (b.date === 'today') return 1
      if (a.date === 'yesterday') return -1
      if (b.date === 'yesterday') return 1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  return sortedGroups
}

// Функция форматирования времени
function formatTime(dateString: string): string {
  const now = new Date()
  const txDate = new Date(dateString)
  const diffMs = now.getTime() - txDate.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate())

  if (txDay.getTime() === today.getTime()) {
    // Сегодня - показываем "X часов назад"
    if (diffHours < 1) {
      return diffMins < 1 ? 'только что' : `${diffMins} мин назад`
    } else {
      return `${diffHours} час${diffHours === 1 ? '' : diffHours < 5 ? 'а' : 'ов'} назад`
    }
  } else {
    // Вчера и старше - показываем время и дату
    return txDate.toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    })
  }
}

// Компонент для отображения участника
function ParticipantDisplay({ 
  name, 
  info, 
  isTeam 
}: { 
  name: string
  info?: any
  isTeam: boolean 
}) {
  const accentColor = isTeam ? "text-[#FF6B6B]" : "text-[#3457D5]"
  
  if (info) {
    const TypeIcon = info.type === 'team' ? Users : info.type === 'startup' ? Rocket : UserCog
    const typeColorClass = info.type === 'team' ? 'text-red-500' : info.type === 'startup' ? 'text-blue-500' : 'text-green-500'
    
    return (
      <div className="flex items-center gap-2">
        <TypeIcon className={`w-4 h-4 ${typeColorClass}`} />
        <span className={`font-medium ${accentColor}`}>
          {info.name}
        </span>
      </div>
    )
  }
  
  return (
    <span className="font-medium text-gray-600 dark:text-gray-400">
      {name}
    </span>
  )
}

// Компонент одной транзакции
function TransactionCard({ 
  transaction, 
  isTeam, 
  pecoinImg 
}: { 
  transaction: Transaction
  isTeam: boolean
  pecoinImg: string
}) {
  const amount = transaction.amount || 0
  // ✅ ПРАВИЛЬНАЯ ЛОГИКА: Используем поле action для определения направления
  const isReceived = transaction.action === "received"
  const isSent = transaction.action === "sent"
  
  return (
    <motion.div
      className={`
        relative p-3 mb-3 rounded-lg border transition-all duration-300 group cursor-pointer
        ${isTeam 
          ? 'bg-gradient-to-r from-white to-red-50/30 dark:from-gray-800 dark:to-red-900/10 border-red-100 dark:border-red-800/20 hover:border-red-200 dark:hover:border-red-700/40 hover:shadow-md' 
          : 'bg-gradient-to-r from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 border-blue-100 dark:border-blue-800/20 hover:border-blue-200 dark:hover:border-blue-700/40 hover:shadow-md'
        }
        hover:scale-[1.01] active:scale-[0.99]
      `}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* АДАПТИВНЫЙ ДИЗАЙН: 1 строка на десктопе, 2 строки на мобильном */}
      
      {/* ДЕСКТОПНАЯ ВЕРСИЯ: Одна строка */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
        {/* Левая часть: Иконка + Сумма + Участник + Комментарий */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Иконка */}
          <div className="relative flex-shrink-0">
            {(transaction.type === "Token" || transaction.type === "PEcoin") ? (
              <>
                <img 
                  src={pecoinImg} 
                  alt="PEcoin" 
                  className="w-8 h-8 rounded-full shadow-sm"
                />
                <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-white text-xs font-bold ${isReceived ? 'bg-green-500' : 'bg-red-500'}`}>
                  {isReceived ? '↓' : '↑'}
                </div>
              </>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-bold">NFT</span>
              </div>
            )}
          </div>
          
          {/* Сумма */}
          <div className="flex-shrink-0">
            {(transaction.type === "Token" || transaction.type === "PEcoin") ? (
              <span className={`font-bold text-lg ${isReceived ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isReceived ? '+' : '-'}{Math.abs(amount)} PE
              </span>
            ) : (
              <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                {transaction.nftName || 'NFT'}
              </span>
            )}
          </div>
          
          {/* Участник */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-sm ${isTeam ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {(transaction.type === "Token" || transaction.type === "PEcoin") ? (
                isReceived ? "от" : "→"
              ) : (
                transaction.action === "received" ? "от" : "→"
              )}
            </span>
            <ParticipantDisplay 
              name={isReceived 
                ? (transaction.senderName || transaction.sender) 
                : (transaction.receiverName || transaction.receiver)
              } 
              info={isReceived ? transaction.senderInfo : transaction.receiverInfo} 
              isTeam={isTeam} 
            />
          </div>
          
          {/* Комментарий */}
          {transaction.memo && (
            <div className="flex items-center gap-2 flex-1 min-w-0 ml-3">
              <span className="text-sm">💬</span>
              <span className="text-gray-700 dark:text-gray-300 text-sm font-bold truncate">
                «{transaction.memo}»
              </span>
            </div>
          )}
        </div>
        
        {/* Время справа */}
        <div className={`text-sm font-medium flex-shrink-0 ${isTeam ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
          {formatTime(transaction.date)}
        </div>
      </div>

      {/* МОБИЛЬНАЯ ВЕРСИЯ: Две строки */}
      <div className="md:hidden">
        {/* Строка 1: Иконка + Сумма + Участник */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Компактная иконка с индикатором */}
            <div className="relative flex-shrink-0">
              {(transaction.type === "Token" || transaction.type === "PEcoin") ? (
                <>
                  <img 
                    src={pecoinImg} 
                    alt="PEcoin" 
                    className="w-8 h-8 rounded-full shadow-sm"
                  />
                  <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-white text-xs font-bold ${isReceived ? 'bg-green-500' : 'bg-red-500'}`}>
                    {isReceived ? '↓' : '↑'}
                  </div>
                </>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-xs font-bold">NFT</span>
                </div>
              )}
            </div>
            
            {/* Сумма */}
            {(transaction.type === "Token" || transaction.type === "PEcoin") ? (
              <span className={`font-bold text-lg ${isReceived ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isReceived ? '+' : '-'}{Math.abs(amount)} PE
              </span>
            ) : (
              <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                {transaction.nftName || 'NFT'}
              </span>
            )}
          </div>
          
          {/* Участник */}
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isTeam ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {(transaction.type === "Token" || transaction.type === "PEcoin") ? (
                isReceived ? "от" : "→"
              ) : (
                transaction.action === "received" ? "от" : "→"
              )}
            </span>
            <ParticipantDisplay 
              name={isReceived 
                ? (transaction.senderName || transaction.sender) 
                : (transaction.receiverName || transaction.receiver)
              } 
              info={isReceived ? transaction.senderInfo : transaction.receiverInfo} 
              isTeam={isTeam} 
            />
          </div>
        </div>
        
        {/* Строка 2: Комментарий + Время */}
        <div className="flex items-center justify-between mt-1 ml-11">
          {/* Комментарий с кавычками-елочками */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {transaction.memo ? (
              <>
                <span className="text-sm">💬</span>
                <span className="text-gray-700 dark:text-gray-300 text-sm font-bold truncate">
                  «{transaction.memo}»
                </span>
              </>
            ) : (
              <span></span>
            )}
          </div>
          
          {/* Время */}
          <div className={`text-sm font-medium ${isTeam ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {formatTime(transaction.date)}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function MobileTransactionList({ transactions, entityType = "teams" }: MobileTransactionListProps) {
  const isTeam = entityType === "teams"
  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  const pecoinImg = useTokenImageUrl(pecoinMint, "/images/pecoin.png")

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        Нет транзакций
      </div>
    )
  }

  const groupedTransactions = groupTransactionsByDate(transactions)

  return (
    <div className="space-y-6">
      {groupedTransactions.map((group, groupIndex) => (
        <motion.div
          key={group.date}
          className="space-y-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: groupIndex * 0.1 }}
        >
          {/* Заголовок дня - красивый и информативный */}
          <div className={`
            flex items-center justify-between p-4 mb-6 rounded-xl border-2
            ${isTeam 
              ? 'bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-red-200 dark:border-red-700/30' 
              : 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-700/30'
            }
          `}>
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shadow-sm
                ${isTeam 
                  ? 'bg-gradient-to-br from-red-400 to-red-600' 
                  : 'bg-gradient-to-br from-blue-400 to-blue-600'
                }
              `}>
                <span className="text-white text-lg">📅</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {group.displayDate}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {group.transactions.length} {group.transactions.length === 1 ? 'транзакция' : 'транзакций'}
                </span>
              </div>
            </div>
            
            {/* Общая сумма за день для PEcoin транзакций */}
            <div className="text-right">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Баланс за день
              </div>
              <div className={`text-lg font-bold ${
                (() => {
                  const dayTotal = group.transactions
                    .filter(tx => tx.type === "Token" || tx.type === "PEcoin")
                    .reduce((sum, tx) => {
                      const amount = tx.amount || 0;
                      return sum + (tx.action === "received" ? amount : -amount);
                    }, 0);
                  return dayTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                })()
              }`}>
                {(() => {
                  const dayTotal = group.transactions
                    .filter(tx => tx.type === "Token" || tx.type === "PEcoin")
                    .reduce((sum, tx) => {
                      const amount = tx.amount || 0;
                      return sum + (tx.action === "received" ? amount : -amount);
                    }, 0);
                  return `${dayTotal >= 0 ? '+' : ''}${dayTotal} PE`;
                })()}
              </div>
            </div>
          </div>
          
          {/* Список транзакций дня */}
          <div className="space-y-3">
            {group.transactions.map((transaction, index) => (
              <TransactionCard
                key={transaction.signature || `${transaction.date}-${index}`}
                transaction={transaction}
                isTeam={isTeam}
                pecoinImg={pecoinImg}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
} 