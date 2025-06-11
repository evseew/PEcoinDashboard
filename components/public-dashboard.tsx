"use client"

import { useState, useEffect } from "react"
import { EntityList } from "@/components/entity-list"
import { LoadingOverlay } from "@/components/loading-overlay"
import { ErrorOverlay } from "@/components/error-overlay"
import { useMobile } from "@/hooks/use-mobile"
import { ThemeToggle } from "@/components/theme-toggle"
import { CampIcon } from "@/components/camp-icons"
import { AnimatedBackground } from "@/components/animated-background"
import { motion } from "framer-motion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Rocket } from "lucide-react"
import Link from "next/link"
import { UserCog } from "lucide-react"
import { useTokenImageUrl } from "@/hooks/token-image-provider"
import { supabase } from "@/lib/supabaseClient"

// Получение signedUrl для логотипа
async function getSignedUrl(storageKey: string | null) {
  if (storageKey && !storageKey.startsWith("http")) {
    const { data } = await supabase.storage.from("dashboard.logos").createSignedUrl(storageKey, 60 * 60 * 24 * 7)
    return data?.signedUrl || null
  }
  return storageKey
}

export function PublicDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [startups, setStartups] = useState<any[]>([])
  const [teamSort, setTeamSort] = useState<string>("name")
  const [startupSort, setStartupSort] = useState<string>("name")
  const [activeTab, setActiveTab] = useState<string>("all")
  const isMobile = useMobile()
  const [totalTeamCoins, setTotalTeamCoins] = useState<number | null>(null)
  const [totalStartupCoins, setTotalStartupCoins] = useState<number | null>(null)
  const [totalCoins, setTotalCoins] = useState<number | null>(null)
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [balancesLoading, setBalancesLoading] = useState(false)

  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"
  const pecoinImg = useTokenImageUrl(pecoinMint, "/images/pecoin.png")

  useEffect(() => {
    const fetchData = async () => {
      const startTime = Date.now()
      console.log(`[PublicDashboard] Начинаю загрузку данных...`)
      
      setLoading(true)
      setError(null)
      try {
        console.log(`[PublicDashboard] Загружаю команды и стартапы из Supabase...`)
        const supabaseStart = Date.now()
        
        const { data: teams, error: teamsError } = await supabase.from("teams").select("*")
        const { data: startups, error: startupsError } = await supabase.from("startups").select("*")
        
        console.log(`[PublicDashboard] Supabase запрос выполнен за ${Date.now() - supabaseStart}ms`)
        
        if (teamsError || startupsError) {
          console.error(`[PublicDashboard] Ошибка Supabase:`, { teamsError, startupsError })
          setError("Ошибка загрузки данных")
        } else {
          console.log(`[PublicDashboard] Получено команд: ${teams?.length || 0}, стартапов: ${startups?.length || 0}`)
          
          // Упрощаем логику - не загружаем signedUrl, так как это замедляет процесс
          const teamsWithLogo = (teams || []).map((team) => ({
            ...team,
            logo: team.logo_url, // Используем прямые URL без signed URL для ускорения
          }))
          
          const startupsWithLogo = (startups || []).map((startup) => ({
            ...startup,
            logo: startup.logo_url, // Используем прямые URL без signed URL для ускорения
          }))
          
          setTeams(teamsWithLogo)
          setStartups(startupsWithLogo)
          
          console.log(`[PublicDashboard] Данные загружены за ${Date.now() - startTime}ms`)
        }
      } catch (err) {
        console.error(`[PublicDashboard] Критическая ошибка:`, err)
        setError("Failed to load dashboard data")
      } finally {
        setLoading(false)
        console.log(`[PublicDashboard] Общее время загрузки: ${Date.now() - startTime}ms`)
      }
    }
    fetchData()
  }, [])

  // Групповая загрузка балансов для всех участников
  useEffect(() => {
    const fetchAllBalances = async () => {
      if (teams.length === 0 && startups.length === 0) return
      
      const startTime = Date.now()
      console.log('[PublicDashboard] Начинаю групповую загрузку балансов...')
      
      setBalancesLoading(true)
      
      try {
        // Собираем все уникальные адреса кошельков
        const teamWallets = teams.filter(team => team.wallet_address).map(team => team.wallet_address)
        const startupWallets = startups.filter(startup => startup.wallet_address).map(startup => startup.wallet_address)
        const allWallets = [...new Set([...teamWallets, ...startupWallets])] // убираем дубликаты
        
        if (allWallets.length === 0) {
          setBalancesLoading(false)
          return
        }
        
        console.log(`[PublicDashboard] Загружаю балансы для ${allWallets.length} кошельков одним запросом`)
        
        // Один запрос для всех кошельков
        const response = await fetch('/api/token-balances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            wallets: allWallets, 
            mint: pecoinMint 
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          const fetchedBalances = data.balances || {}
          
          setBalances(fetchedBalances)
          
          // Подсчитываем суммы для команд и стартапов
          const teamSum = teamWallets.reduce((sum, wallet) => sum + (fetchedBalances[wallet] || 0), 0)
          const startupSum = startupWallets.reduce((sum, wallet) => sum + (fetchedBalances[wallet] || 0), 0)
          
          setTotalTeamCoins(teamSum)
          setTotalStartupCoins(startupSum)
          setTotalCoins(teamSum + startupSum)
          
          console.log(`[PublicDashboard] Балансы загружены за ${Date.now() - startTime}ms`)
        } else {
          console.error('[PublicDashboard] Ошибка загрузки балансов:', response.status)
          setTotalTeamCoins(0)
          setTotalStartupCoins(0)
          setTotalCoins(0)
        }
      } catch (error) {
        console.error('[PublicDashboard] Критическая ошибка загрузки балансов:', error)
        setTotalTeamCoins(0)
        setTotalStartupCoins(0)
        setTotalCoins(0)
      } finally {
        setBalancesLoading(false)
      }
    }
    
    fetchAllBalances()
  }, [teams, startups, pecoinMint])

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
    }
  }

  if (error) {
    return <ErrorOverlay message={error} />
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 dark:text-white overflow-hidden">
      {loading && <LoadingOverlay />}
      <AnimatedBackground />

      <header className="py-6 px-4 md:px-8 border-b-4 border-[#FF6B6B] dark:border-[#FF6B6B]/80 relative bg-gradient-to-r from-[#FFD166]/10 to-[#06D6A0]/10 dark:from-[#FFD166]/5 dark:to-[#06D6A0]/5">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div
            className="flex flex-col md:flex-row items-center gap-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="w-48 h-16">
              <img src="/images/camp-logo.png" alt="PlanetEnglish Camp" className="h-full object-contain" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] bg-clip-text text-transparent drop-shadow-sm">
                StartUP Dashboard
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
                Track teams, startups, and PEcoin transactions
              </p>
            </div>
          </motion.div>

          <div className="flex items-center space-x-3 self-center md:self-auto">
            <div className="flex items-center bg-white/80 dark:bg-gray-800/80 rounded-full px-3 py-1.5 shadow-sm">
              <div className="w-5 h-5 mr-2">
                <img src={pecoinImg} alt="PEcoin" className="w-full h-full object-cover rounded-full bg-transparent" />
              </div>
              <span className="font-bold text-sm">{totalCoins !== null ? totalCoins.toLocaleString() : "..."}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">in circulation</span>
            </div>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 bg-gradient-to-r from-[#FFD166] to-[#FF6B6B] rounded-full shadow-sm"
            >
              <CampIcon type="beach" size="sm" />
            </motion.div>
            <Link href="/login/admin">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 bg-gradient-to-r from-[#FF6B6B] to-[#06D6A0] rounded-full shadow-sm"
                title="Admin Login"
              >
                <UserCog className="h-5 w-5 text-white" />
              </motion.div>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto py-4 px-4 md:px-8">
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
                <img src={pecoinImg} alt="PEcoin" className="h-4 w-4 object-cover rounded-full bg-transparent" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Startup PEcoins</p>
                <p className="text-lg font-bold">{totalStartupCoins !== null ? totalStartupCoins.toLocaleString() : "..."}</p>
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
              />
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
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
