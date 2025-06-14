"use client"

import { useState, useEffect } from "react"
import { adminCacheUtils } from "@/hooks/use-admin-data"
import { motion } from "framer-motion"
import { Database, RefreshCw, Trash2 } from "lucide-react"

export function CacheStats() {
  const [stats, setStats] = useState({
    totalEntries: 0,
    validEntries: 0,
    cacheHitRate: 0
  })

  const refreshStats = () => {
    const cacheStats = adminCacheUtils.getStats()
    setStats(cacheStats)
  }

  useEffect(() => {
    refreshStats()
    // Обновляем статистику каждые 5 секунд
    const interval = setInterval(refreshStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const clearCache = () => {
    adminCacheUtils.clearAll()
    refreshStats()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Database className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold">Кэш админки</h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={refreshStats}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title="Обновить статистику"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            onClick={clearCache}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-red-600 dark:hover:text-red-400"
            title="Очистить кэш"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">{stats.totalEntries}</div>
          <div className="text-gray-500">Записей</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">{stats.validEntries}</div>
          <div className="text-gray-500">Валидных</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-purple-600">{stats.cacheHitRate.toFixed(1)}%</div>
          <div className="text-gray-500">Hit Rate</div>
        </div>
      </div>
      
      {stats.totalEntries > 0 && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${stats.cacheHitRate}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
} 