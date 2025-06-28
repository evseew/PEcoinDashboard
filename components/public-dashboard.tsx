"use client"

import { useState, useEffect, useMemo } from "react"
import { EntityList } from "@/components/entity-list"
import { LoadingOverlay } from "@/components/loading-overlay"
import { ErrorOverlay } from "@/components/error-overlay"
import { useMobile } from "@/hooks/use-mobile"
import { useDashboardBalances } from "@/hooks/use-dashboard-balances"
import { useBatchNFTCollections } from "@/hooks/use-nft-collections"
import { ThemeToggle } from "@/components/theme-toggle"
import { CampIcon } from "@/components/camp-icons"
import { AnimatedBackground } from "@/components/animated-background"
import { motion } from "framer-motion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Rocket, Home, Trophy } from "lucide-react"
import Link from "next/link"
import { UserCog } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { signedUrlCache } from "@/lib/signed-url-cache"

// Получение signedUrl для логотипа с кэшированием
async function getSignedUrl(storageKey: string | null): Promise<string | null> {
  return signedUrlCache.getSignedUrl(storageKey)
}

// ✅ УПРОЩЕНО: Локальное кэширование только для команд/стартапов
const localCache = {
  teams: null as any[] | null,
  startups: null as any[] | null,
  timestamp: 0
}

export function PublicDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [startups, setStartups] = useState<any[]>([])
  const [teamSort, setTeamSort] = useState<string>("age")
  const [startupSort, setStartupSort] = useState<string>("age")
  const [activeTab, setActiveTab] = useState<string>("all")
  const isMobile = useMobile()

  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  const pecoinImg = "/images/pecoin.png"

  // ✅ НОВЫЙ ПОДХОД: Используем специализированный хук для балансов
  const {
    balances,
    totalTeamCoins,
    totalStartupCoins,
    totalCoins,
    isLoading: balancesLoading,
    isStale: balancesStale,
    error: balancesError,
    refresh: refreshBalances
  } = useDashboardBalances({
    teams,
    startups,
    pecoinMint,
    autoRefreshInterval: 5 * 60 * 1000 // Автообновление каждые 5 минут
  })

  // ✅ БАТЧ-ЗАГРУЗКА NFT для всех кошельков сразу (мемоизировано для предотвращения зацикливания)
  const allWallets = useMemo(() => [...new Set([
    ...teams.filter(team => team.wallet_address).map(team => team.wallet_address),
    ...startups.filter(startup => startup.wallet_address).map(startup => startup.wallet_address)
  ])], [teams, startups])

  const {
    batchResults: nftResults,
    isLoading: nftLoading,
    error: nftError,
    getNFTCountForWallet,
    totalNFTs,
    refetch: refreshNFTs
  } = useBatchNFTCollections(allWallets)

  // ✅ УПРОЩЕНО: Загрузка только команд и стартапов
  useEffect(() => {
    const fetchTeamsAndStartups = async () => {
      const startTime = Date.now()
      console.log(`[PublicDashboard] 🚀 Загружаю команды и стартапы...`)
      
      setLoading(true)
      setError(null)
      
      // ✅ Показываем кэшированные данные сразу (optimistic UI)
      if (localCache.teams && localCache.startups && (Date.now() - localCache.timestamp) < 60000) {
        console.log(`[PublicDashboard] 💾 Показываем кэшированные команды/стартапы (возраст: ${Math.round((Date.now() - localCache.timestamp) / 1000)}s)`)
        setTeams(localCache.teams)
        setStartups(localCache.startups)
        setLoading(false)
      }
      
      try {
        console.log(`[PublicDashboard] 📊 Параллельная загрузка команд и стартапов...`)
        
        // ✅ Параллельные запросы для команд и стартапов
        const [teamsResult, startupsResult] = await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("startups").select("*")
        ])
        
        const dataLoadTime = Date.now() - startTime
        console.log(`[PublicDashboard] ⚡ Supabase данные получены за ${dataLoadTime}ms`)
        
        if (teamsResult.error || startupsResult.error) {
          console.error(`[PublicDashboard] ❌ Ошибка Supabase:`, { 
            teams: teamsResult.error, 
            startups: startupsResult.error 
          })
          setError("Ошибка загрузки данных")
          return
        }

        // Получаем signed URLs параллельно
        const signedUrlStart = Date.now()
        const [teamsWithLogo, startupsWithLogo] = await Promise.all([
          Promise.all((teamsResult.data || []).map(async (team) => ({
            ...team,
            logo: await getSignedUrl(team.logo_url),
          }))),
          Promise.all((startupsResult.data || []).map(async (startup) => ({
            ...startup,
            logo: await getSignedUrl(startup.logo_url),
          })))
        ])
        
        console.log(`[PublicDashboard] 🖼️ Signed URLs получены за ${Date.now() - signedUrlStart}ms`)
        
        // Сортируем по возрасту
        const sortedTeams = teamsWithLogo.sort((a, b) => {
          const ageA = a.age_range_min || 999
          const ageB = b.age_range_min || 999
          return ageA - ageB
        })
        
        const sortedStartups = startupsWithLogo.sort((a, b) => {
          const ageA = a.age_range_min || 999
          const ageB = b.age_range_min || 999
          return ageA - ageB
        })
        
        // ✅ Обновляем состояние
        setTeams(sortedTeams)
        setStartups(sortedStartups)
        
        // ✅ Сохраняем в локальный кэш
        localCache.teams = sortedTeams
        localCache.startups = sortedStartups
        localCache.timestamp = Date.now()
        
        const totalTime = Date.now() - startTime
        console.log(`[PublicDashboard] 🎉 Команды и стартапы загружены за ${totalTime}ms (команды: ${sortedTeams.length}, стартапы: ${sortedStartups.length})`)
        
      } catch (err) {
        console.error(`[PublicDashboard] ❌ Критическая ошибка:`, err)
        setError("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    
    fetchTeamsAndStartups()
  }, []) // ✅ Загружаем только команды/стартапы, балансы управляются отдельным хуком

  const handleTeamSort = (sortBy: string) => {
    setTeamSort(sortBy)
    if (sortBy === "name") {
      setTeams([...teams].sort((a, b) => a.name.localeCompare(b.name)))
    } else if (sortBy === "balance") {
      setTeams([...teams].sort((a, b) => {
        const balanceA = balances[a.wallet_address] || 0
        const balanceB = balances[b.wallet_address] || 0
        return balanceB - balanceA
      }))
    } else if (sortBy === "age") {
      setTeams([...teams].sort((a, b) => {
        // Сортировка от младших к старшим
        const ageA = a.age_range_min || 999 // Команды без возраста идут в конец
        const ageB = b.age_range_min || 999
        return ageA - ageB
      }))
    }
  }

  const handleStartupSort = (sortBy: string) => {
    setStartupSort(sortBy)
    if (sortBy === "name") {
      setStartups([...startups].sort((a, b) => a.name.localeCompare(b.name)))
    } else if (sortBy === "balance") {
      setStartups([...startups].sort((a, b) => {
        const balanceA = balances[a.wallet_address] || 0
        const balanceB = balances[b.wallet_address] || 0
        return balanceB - balanceA
      }))
    } else if (sortBy === "age") {
      setStartups([...startups].sort((a, b) => {
        // Сортировка от младших к старшим
        const ageA = a.age_range_min || 999 // Стартапы без возраста идут в конец
        const ageB = b.age_range_min || 999
        return ageA - ageB
      }))
    }
  }

  if (error) {
    return <ErrorOverlay message={error} />
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 dark:text-white overflow-hidden">
      {loading && <LoadingOverlay />}
      <AnimatedBackground />

      <header className="relative overflow-hidden">
        {/* Background with enhanced gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFD166]/15 via-[#FF6B6B]/10 to-[#06D6A0]/15 dark:from-[#FFD166]/8 dark:via-[#FF6B6B]/6 dark:to-[#06D6A0]/8"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        
        {/* Animated particles */}
        <div className="absolute top-4 left-1/4 w-2 h-2 bg-[#FFD166]/30 rounded-full animate-pulse"></div>
        <div className="absolute top-8 right-1/3 w-1.5 h-1.5 bg-[#06D6A0]/40 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-6 left-1/3 w-1 h-1 bg-[#FF6B6B]/30 rounded-full animate-pulse delay-500"></div>
        
                <div className="relative px-3 sm:px-4 md:px-8 py-6 sm:py-8">
          {/* Desktop Layout - горизонтальная структура */}
          <div className="hidden md:flex items-center justify-between w-full">
            {/* Left section: Logo only */}
            <motion.div
              className="flex-shrink-0"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <img src="/images/camp-logo.png" alt="PlanetEnglish Camp" className="h-16 w-auto object-contain" />
              </motion.div>
            </motion.div>
            
            {                /* Center section: Title and PEcoin Stats on same line */}
            <div className="flex-1 flex flex-col items-center px-4">
              <div className="flex items-center gap-6 max-w-4xl">
                <div className="text-center flex-shrink-0">
                  <motion.h1 
                    className="text-3xl lg:text-4xl xl:text-5xl font-display font-black bg-gradient-to-r from-[#FF6B6B] via-[#FFD166] to-[#06D6A0] bg-clip-text text-transparent leading-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    StartUP Dashboard
                  </motion.h1>
                  <motion.p 
                    className="text-sm lg:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Track teams, startups, and PEcoin transactions
                  </motion.p>
                </div>
                
                {/* PEcoin Stats - on same line */}
                <motion.div 
                  className="flex items-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-white/20 dark:border-gray-700/30 flex-shrink-0"
                  whileHover={{ scale: 1.02, y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  <div className="relative mr-3">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD166] to-[#FF6B6B] rounded-full blur opacity-75"></div>
                    <div className="relative w-7 h-7 bg-white dark:bg-gray-800 rounded-full p-1">
                      <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full" />
                      {/* ✅ Индикатор загрузки/обновления */}
                      {(balancesLoading || balancesStale) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-base text-gray-900 dark:text-white">
                        {totalCoins.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">PEcoins</span>
                      {balancesStale && (
                        <span className="text-xs text-blue-500" title="Обновляется в фоне">↻</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {balancesError ? "Ошибка загрузки" : "in circulation"}
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right section: Control buttons only */}
            <motion.div
              className="flex items-center gap-2 flex-shrink-0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Link href="/">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                  title="Back to Landing"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                  <div className="relative p-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] rounded-full shadow-lg">
                    <Home className="h-4 w-4 text-white" />
                  </div>
                </motion.div>
              </Link>

              <Link href="/login/admin">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                  title="Admin Panel"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#06D6A0] to-[#118AB2] rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                  <div className="relative p-2.5 bg-gradient-to-r from-[#06D6A0] to-[#118AB2] rounded-full shadow-lg">
                    <UserCog className="h-4 w-4 text-white" />
                  </div>
                </motion.div>
              </Link>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="p-0.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg border border-white/30 dark:border-gray-700/30">
                  <ThemeToggle />
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Mobile Layout - вертикальная структура */}
          <div className="md:hidden flex flex-col items-center space-y-4">
            {/* 1. Логотип по центру */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <img src="/images/camp-logo.png" alt="PlanetEnglish Camp" className="h-28 w-auto object-contain max-w-sm" />
              </motion.div>
            </motion.div>

            {/* 2. Заголовок по центру */}
            <div className="text-center">
              <motion.h1 
                className="text-3xl sm:text-4xl font-display font-black bg-gradient-to-r from-[#FF6B6B] via-[#FFD166] to-[#06D6A0] bg-clip-text text-transparent leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                StartUP Dashboard
              </motion.h1>
              <motion.p 
                className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium px-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Track teams, startups, and PEcoin transactions
              </motion.p>
            </div>

                         {/* 3. PEcoin статистика и кнопки управления в одну строку */}
             <div className="flex items-center justify-between w-full max-w-xs gap-2">
               {/* PEcoin Stats */}
               <motion.div 
                 className="flex items-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg pl-1 pr-1.5 py-1.5 shadow-lg border border-white/20 dark:border-gray-700/30 min-w-0 flex-1"
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ duration: 0.8, delay: 0.5 }}
                 onClick={refreshBalances}
                 title="Нажмите для обновления балансов"
               >
                 <div className="relative mr-1 flex-shrink-0">
                   <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FFD166] to-[#FF6B6B] rounded-full blur opacity-75"></div>
                   <div className="relative w-5 h-5 bg-white dark:bg-gray-800 rounded-full p-0">
                     <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full" />
                     {/* ✅ Мобильный индикатор загрузки */}
                     {(balancesLoading || balancesStale) && (
                       <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                     )}
                   </div>
                 </div>
                 <div className="min-w-0">
                   <div className="flex items-baseline gap-1">
                     <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                       {totalCoins.toLocaleString()}
                     </span>
                     <span className="text-xs font-medium text-gray-500 dark:text-gray-400">PEcoin</span>
                     {balancesStale && (
                       <span className="text-xs text-blue-500">↻</span>
                     )}
                   </div>
                   <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                     {balancesError ? "Ошибка" : "in circulation"}
                   </span>
                 </div>
               </motion.div>

              {/* Control buttons */}
              <motion.div
                className="flex items-center gap-1.5 flex-shrink-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Link href="/">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 3 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative group"
                    title="Back to Landing"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                    <div className="relative p-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] rounded-full shadow-lg">
                      <Home className="h-3.5 w-3.5 text-white" />
                    </div>
                  </motion.div>
                </Link>

                <Link href="/login/admin">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 3 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative group"
                    title="Admin Panel"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#06D6A0] to-[#118AB2] rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                    <div className="relative p-1.5 bg-gradient-to-r from-[#06D6A0] to-[#118AB2] rounded-full shadow-lg">
                      <UserCog className="h-3.5 w-3.5 text-white" />
                    </div>
                  </motion.div>
                </Link>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <div className="p-0.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg border border-white/30 dark:border-gray-700/30">
                    <ThemeToggle />
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
        
        {/* Bottom border with gradient */}
        <div className="h-1 bg-gradient-to-r from-[#FFD166] via-[#FF6B6B] to-[#06D6A0]"></div>
      </header>

      <div className="py-4 px-4 md:px-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700"
            whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-[#FFEE98]/30 dark:bg-[#FFEE98]/20 rounded-full mr-3">
                <Users className="h-4 w-4 text-[#FFA41B]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Teams</p>
                <p className="text-lg font-bold">{teams.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700"
            whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-[#6ABECD]/30 dark:bg-[#6ABECD]/20 rounded-full mr-3">
                <Rocket className="h-4 w-4 text-[#3457D5]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Startups</p>
                <p className="text-lg font-bold">{startups.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700"
            whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-[#FFD166]/30 dark:bg-[#FFD166]/20 rounded-full mr-3">
                <img src={pecoinImg} alt="PEcoin" className="h-4 w-4 object-cover rounded-full bg-transparent" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Team PEcoins</p>
                <p className="text-lg font-bold">{totalTeamCoins !== null ? totalTeamCoins.toLocaleString() : "..."}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700"
            whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-[#06D6A0]/30 dark:bg-[#06D6A0]/20 rounded-full mr-3">
                <Trophy className="h-4 w-4 text-[#06D6A0]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total NFTs</p>
                <p className="text-lg font-bold">{nftLoading ? "..." : totalNFTs.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden mb-4">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All Entities
              </TabsTrigger>
              <TabsTrigger value="teams" className="text-xs">
                Teams
              </TabsTrigger>
              <TabsTrigger value="startups" className="text-xs">
                Startups
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Teams Section */}
          {(activeTab === "all" || activeTab === "teams") && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="h-full"
            >
              <div className="space-y-4">
                <EntityList
                  title="Teams"
                  entities={teams}
                  type="teams"
                  currentSort={teamSort}
                  onSort={handleTeamSort}
                  icon="team"
                  compact={true}
                  balances={balances}
                  balancesLoading={balancesLoading}
                  nftCounts={nftResults}
                  nftLoading={nftLoading}
                  getNFTCount={getNFTCountForWallet}

                />
              </div>
            </motion.div>
          )}

          {/* Startups Section */}
          {(activeTab === "all" || activeTab === "startups") && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="h-full"
            >
              <EntityList
                title="Startups"
                entities={startups}
                type="startups"
                currentSort={startupSort}
                onSort={handleStartupSort}
                icon="startup"
                compact={true}
                balances={balances}
                balancesLoading={balancesLoading}
                nftCounts={nftResults}
                nftLoading={nftLoading}
                getNFTCount={getNFTCountForWallet}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
