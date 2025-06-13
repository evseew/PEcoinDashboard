"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { motion } from "framer-motion"
import { Users, UserCog, Wallet, Award, Target, ArrowUp, ArrowDown, Rocket, RefreshCw } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    teams: { count: 0, change: 0 },
    startups: { count: 0, change: 0 },
    staff: { count: 0, change: 0 },
    totalPEcoins: { count: 0, change: 0 },
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

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
        await fetchDashboardData()
      } else {
        console.error('Ошибка инициализации экосистемы')
      }
    } catch (error) {
      console.error('Ошибка инициализации:', error)
    } finally {
      setIsInitializing(false)
    }
  }

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Получаем реальные данные из API
      const response = await fetch('/api/admin/dashboard-stats')
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить статистику дашборда')
      }

      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        setRecentActivity(data.recentActivity || [])
      } else {
        throw new Error(data.error || 'Ошибка получения данных')
      }
    } catch (error) {
      console.error("Ошибка загрузки данных дашборда:", error)
      // В случае ошибки показываем нулевые значения
      setStats({
        teams: { count: 0, change: 0 },
        startups: { count: 0, change: 0 },
        staff: { count: 0, change: 0 },
        totalPEcoins: { count: 0, change: 0 },
      })
      setRecentActivity([])
    } finally {
      setIsLoading(false)
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Startups Card */}
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

          {/* Staff Card */}
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

          {/* Total PEcoins Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total PEcoins</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalPEcoins.count.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Wallet className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {stats.totalPEcoins.change > 0 ? (
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
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start space-x-3 min-h-[48px]">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-5">
                        {activity.title || activity.description}
                      </p>
                      {activity.description && activity.title && activity.description !== activity.title && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {activity.description}
                        </p>
                      )}
                      {activity.date && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {activity.date === 'Today' ? 'Сегодня' : activity.date}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {activity.time}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Нет последней активности
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

