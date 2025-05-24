"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { motion } from "framer-motion"
import { Users, UserCog, Wallet, Award, Target, ArrowUp, ArrowDown } from "lucide-react"
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)
      try {
        // In a real app, you would fetch this data from your API
        // For now, we'll use mock data
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setStats({
          teams: { count: 15, change: 2 },
          startups: { count: 15, change: 1 },
          staff: { count: 5, change: 0 },
          totalPEcoins: { count: 42500, change: 1500 },
        })

        setRecentActivity([
          {
            id: 1,
            time: "10:30 AM",
            date: "Today",
            description: 'Team "Coding Wizards" received 500 PEcoins',
            type: "transaction",
          },
          {
            id: 2,
            time: "09:15 AM",
            date: "Today",
            description: 'Startup "CryptoLearn" updated their profile',
            type: "update",
          },
          {
            id: 3,
            time: "08:45 AM",
            date: "Today",
            description: 'New NFT "Summer Camp Badge" created',
            type: "nft",
          },
          {
            id: 4,
            time: "Yesterday",
            date: "May 16, 2025",
            description: 'New team "Algorithm Aces" added',
            type: "team",
          },
          {
            id: 5,
            time: "Yesterday",
            date: "May 16, 2025",
            description: 'Staff member "Emma Wilson" joined',
            type: "staff",
          },
          {
            id: 6,
            time: "Yesterday",
            date: "May 16, 2025",
            description: 'Startup "Web3 Juniors" received 300 PEcoins',
            type: "transaction",
          },
        ])
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

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
        <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome, {user?.email}. Here's an overview of your PEcoin ecosystem.
        </p>

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

          {/* Other stats cards... */}
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-display font-bold">Recent Activity</h2>
          </div>

          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#FF6B6B] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-start">
                    <div className="mr-3 mt-0.5">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</span>
                        {activity.date !== "Today" && (
                          <>
                            <span className="mx-1 text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{activity.date}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  )
}
