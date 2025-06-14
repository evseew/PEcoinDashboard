"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { motion } from "framer-motion"
import { Users, UserCog, Wallet, Award, Target, ArrowUp, ArrowDown, Rocket, RefreshCw } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useAdminDashboard } from "@/hooks/use-admin-data"

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { 
    stats, 
    recentActivity, 
    isLoading, 
    balancesLoading, 
    error, 
    refetch 
  } = useAdminDashboard()
  
  const [isInitializing, setIsInitializing] = useState(false)

  const handleInitializeEcosystem = async () => {
    setIsInitializing(true)
    try {
      const response = await fetch('/api/admin/initialize-ecosystem', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Экосистема инициализирована:', data)
        // Перезагружаем данные дашборда
        refetch()
      } else {
        console.error('Ошибка инициализации экосистемы')
      }
    } catch (error) {
      console.error('Ошибка инициализации:', error)
    } finally {
      setIsInitializing(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "transaction":
        return <Wallet className="h-4 w-4 text-[#FF6B6B]" />
      case "update":
        return <Award className="h-4 w-4 text-[#06D6A0]" />
      case "nft":
        return <Award className="h-4 w-4 text-[#FFD166]" />
      case "team":
        return <Users className="h-4 w-4 text-[#118AB2]" />
      case "staff":
        return <UserCog className="h-4 w-4 text-[#073B4C]" />
      default:
        return <Target className="h-4 w-4 text-gray-400" />
    }
  }

  // Скелетон для загрузки
  const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
        </div>
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
      <div className="mt-4">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
      </div>
    </div>
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome, {user?.email}. Here's an overview of your PEcoin ecosystem.
            </p>
          </div>
          
          {/* Кнопка управления */}
          <div className="flex gap-2">
            <motion.button
              onClick={handleInitializeEcosystem}
              disabled={isInitializing || isLoading}
              className="flex items-center px-4 py-2 bg-[#FF6B6B] text-white rounded-lg hover:bg-[#FF5252] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isInitializing ? 'animate-spin' : ''}`} />
              {isInitializing ? 'Инициализация...' : 'Обновить PEcoins'}
            </motion.button>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Teams Card */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Teams</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.teams.count}</h3>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {stats.teams.change > 0 ? (
                  <div className="flex items-center text-green-500 text-xs">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    <span>+{stats.teams.change} new</span>
                  </div>
                ) : stats.teams.change < 0 ? (
                  <div className="flex items-center text-red-500 text-xs">
                    <ArrowDown className="h-3 w-3 mr-1" />
                    <span>{stats.teams.change} removed</span>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-xs">No change</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Startups Card */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Startups</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.startups.count}</h3>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Rocket className="h-5 w-5 text-purple-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {stats.startups.change > 0 ? (
                  <div className="flex items-center text-green-500 text-xs">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    <span>+{stats.startups.change} new</span>
                  </div>
                ) : stats.startups.change < 0 ? (
                  <div className="flex items-center text-red-500 text-xs">
                    <ArrowDown className="h-3 w-3 mr-1" />
                    <span>{stats.startups.change} removed</span>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-xs">No change</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Staff Card */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Staff</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.staff.count}</h3>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <UserCog className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {stats.staff.change > 0 ? (
                  <div className="flex items-center text-green-500 text-xs">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    <span>+{stats.staff.change} new</span>
                  </div>
                ) : stats.staff.change < 0 ? (
                  <div className="flex items-center text-red-500 text-xs">
                    <ArrowDown className="h-3 w-3 mr-1" />
                    <span>{stats.staff.change} removed</span>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-xs">No change</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Total PEcoins Card - с индикатором загрузки */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total PEcoins</p>
                  {balancesLoading && (
                    <div className="animate-spin h-3 w-3 border border-gray-400 rounded-full border-t-transparent"></div>
                  )}
                </div>
                {balancesLoading && !stats.totalPEcoins.count ? (
                  <div className="mt-1 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
                ) : (
                  <h3 className="text-2xl font-bold mt-1">
                    {stats.totalPEcoins.count.toLocaleString()}
                  </h3>
                )}
              </div>
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Wallet className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {balancesLoading ? (
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
              ) : stats.totalPEcoins.change > 0 ? (
                <div className="flex items-center text-green-500 text-xs">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  <span>+{stats.totalPEcoins.change} tokens</span>
                </div>
              ) : stats.totalPEcoins.change < 0 ? (
                <div className="flex items-center text-red-500 text-xs">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  <span>{stats.totalPEcoins.change} tokens</span>
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-xs">No change</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-display font-semibold">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              // Скелетон для активности
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2 w-48"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                  </div>
                </div>
              ))
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {activity.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                      {activity.time}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

