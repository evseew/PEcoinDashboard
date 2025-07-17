"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { EntityTable } from "@/components/admin/entity-table"
import { supabase } from "@/lib/supabaseClient"
import { uploadEntityLogo, handleExistingLogo } from "@/lib/upload-client"
import { v4 as uuidv4 } from "uuid"

interface Staff {
  id: string
  name: string
  walletAddress: string
  logo?: string | null
  description?: string
  balance?: number
  nftCount?: number
  solBalance?: number
  [key: string]: unknown
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [nftCountsLoading, setNftCountsLoading] = useState(false)
  const [solBalancesLoading, setSolBalancesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [nftCounts, setNftCounts] = useState<Record<string, number>>({})
  const [solBalances, setSolBalances] = useState<Record<string, number>>({})

  // PEcoin mint address
  const pecoinMint = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r"

  const fetchStaff = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error } = await supabase.from("staff").select("*")
    if (error) setError(error.message)
    setStaff(
      (data || []).map((person: any) => ({
        id: person.id,
        name: person.name,
        walletAddress: person.wallet_address,
        logo: person.logo_url,
        description: person.description,
      }))
    )
    setIsLoading(false)
  }

  // ✅ BATCH-загрузка балансов всех участников состава одним запросом
  const fetchAllBalances = async (staffList: Staff[]) => {
    if (staffList.length === 0) return

    console.log('[Staff Page] ⚡ Загружаю балансы для всех участников состава...')
    setBalancesLoading(true)
    
    try {
      // Собираем все уникальные адреса кошельков
      const wallets = staffList
        .filter(person => person.walletAddress)
        .map(person => person.walletAddress)
      
      if (wallets.length === 0) {
        setBalancesLoading(false)
        return
      }
      
      // ОДИН запрос для всех балансов
      const response = await fetch('/api/token-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          wallets,
          mint: pecoinMint 
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setBalances(data.balances || {})
        console.log(`[Staff Page] ✅ Загружено ${Object.keys(data.balances || {}).length} балансов`)
      } else {
        console.error('[Staff Page] ❌ Ошибка загрузки балансов:', response.status)
      }
    } catch (error) {
      console.error('[Staff Page] ❌ Ошибка получения балансов:', error)
    } finally {
      setBalancesLoading(false)
    }
  }

  // ✅ ОПТИМИЗИРОВАННАЯ ФУНКЦИЯ: BATCH-загрузка NFT counts с кэшированием
  const fetchAllNFTCounts = async (staffList: Staff[]) => {
    if (staffList.length === 0) return

    console.log('[Staff Page] 🖼️ Загружаю NFT counts для всех участников состава...')
    setNftCountsLoading(true)
    
    try {
      // Собираем все уникальные адреса кошельков
      const wallets = staffList
        .filter(person => person.walletAddress)
        .map(person => person.walletAddress)
      
      if (wallets.length === 0) {
        setNftCountsLoading(false)
        return
      }
      
      // ✅ ИСПОЛЬЗУЕМ BATCH ENDPOINT с таймаутом
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 сек максимум
      
      const response = await fetch('/api/nft-collection/batch-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          wallets  // Используем новый batch API
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        setNftCounts(data.counts || {})
        
        const totalNFTs = Object.values(data.counts || {}).reduce((sum: number, count: any) => sum + count, 0)
        const timing = data.timing?.total || 0
        const fromCache = data.timing?.fromCache
        
        console.log(`[Staff Page] ✅ Загружено ${Object.keys(data.counts || {}).length} кошельков, ${totalNFTs} NFT за ${timing}ms ${fromCache ? '(из кэша)' : ''}`)
      } else {
        console.error('[Staff Page] ❌ Ошибка загрузки NFT counts:', response.status)
        const errorText = await response.text()
        console.error('[Staff Page] ❌ Детали ошибки:', errorText)
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn('[Staff Page] ⏰ Загрузка NFT counts заняла слишком много времени, отменена')
      } else {
        console.error('[Staff Page] ❌ Ошибка получения NFT counts:', error)
      }
    } finally {
      setNftCountsLoading(false)
    }
  }

  // ✅ BATCH-загрузка SOL балансов всех участников состава одним запросом
  const fetchAllSolBalances = async (staffList: Staff[]) => {
    if (staffList.length === 0) return

    console.log('[Staff Page] ⚡ Загружаю SOL балансы для всех участников состава...')
    setSolBalancesLoading(true)
    
    try {
      // Собираем все уникальные адреса кошельков
      const wallets = staffList
        .filter(person => person.walletAddress)
        .map(person => person.walletAddress)
      
      if (wallets.length === 0) {
        setSolBalancesLoading(false)
        return
      }
      
      // ОДИН запрос для всех SOL балансов
      const response = await fetch('/api/solana-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallets }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setSolBalances(data.balances || {})
        console.log(`[Staff Page] ✅ Загружено ${Object.keys(data.balances || {}).length} SOL балансов`)
      } else {
        console.error('[Staff Page] ❌ Ошибка загрузки SOL балансов:', response.status)
      }
    } catch (error) {
      console.error('[Staff Page] ❌ Ошибка получения SOL балансов:', error)
    } finally {
      setSolBalancesLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  // Загружаем балансы, NFT counts и SOL балансы после загрузки участников состава
  useEffect(() => {
    if (staff.length > 0) {
      // ✅ PARALLEL: Загружаем балансы, NFT counts и SOL балансы параллельно!
      Promise.all([
        fetchAllBalances(staff),
        fetchAllNFTCounts(staff),
        fetchAllSolBalances(staff)
      ])
    }
  }, [staff])

  // ✅ СОЗДАНИЕ участника состава с унифицированной загрузкой логотипа
  const handleCreateStaff = async (data: any) => {
    try {
      const staffId = uuidv4()
      let logoPath: string | null = null

      // ✅ ОБРАБОТКА загрузки логотипа
      if (data.logo instanceof File) {
        console.log('[Staff Admin] 📤 Загружаю новый логотип для участника состава:', staffId)
        const uploadResult = await uploadEntityLogo(data.logo, "staff", staffId)
        
        if (!uploadResult.success) {
          setError(`Ошибка загрузки логотипа: ${uploadResult.error}`)
          return
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Staff Admin] ✅ Логотип загружен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL
        logoPath = handleExistingLogo(data.logo)
      }

      const insertData: any = {
        id: staffId,
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
      }
      
      if (logoPath) insertData.logo_url = logoPath

      const { error } = await supabase.from("staff").insert([insertData]).select()
      
      if (error) {
        console.error('[Staff Admin] ❌ Ошибка Supabase insert:', error)
        setError(`Ошибка создания участника состава: ${error.message}`)
        return
      }

      console.log('[Staff Admin] ✅ Участник состава успешно создан:', staffId)
      await fetchStaff() // ✅ Ждем обновления данных перед закрытием модального окна
    } catch (e: any) {
      console.error('[Staff Admin] 💥 Критическая ошибка создания участника состава:', e)
      setError(`Критическая ошибка: ${e.message}`)
    }
  }

  // ✅ ОБНОВЛЕНИЕ участника состава с унифицированной загрузкой логотипа
  const handleUpdateStaff = async (id: string, data: any) => {
    try {
      let logoPath: string | null = null

      // ✅ ОБРАБОТКА загрузки логотипа
      if (data.logo instanceof File) {
        console.log('[Staff Admin] 📤 Обновляю логотип для участника состава:', id)
        const uploadResult = await uploadEntityLogo(data.logo, "staff", id)
        
        if (!uploadResult.success) {
          setError(`Ошибка загрузки логотипа: ${uploadResult.error}`)
          return
        }
        
        logoPath = uploadResult.logoPath || null
        console.log('[Staff Admin] ✅ Логотип обновлен:', logoPath)
      } else {
        // ✅ FALLBACK для существующих URL (не меняем логотип)
        logoPath = handleExistingLogo(data.logo)
      }

      const updateData: any = {
        name: data.name,
        wallet_address: data.walletAddress,
        description: data.description,
      }
      
      // ✅ ОБНОВЛЯЕМ логотип только если был загружен новый файл
      if (logoPath !== null) {
        updateData.logo_url = logoPath
      }

      const { error } = await supabase.from("staff").update(updateData).eq("id", id).select()
      
      if (error) {
        console.error('[Staff Admin] ❌ Ошибка Supabase update:', error)
        setError(`Ошибка обновления участника состава: ${error.message}`)
        return
      }

      console.log('[Staff Admin] ✅ Участник состава успешно обновлен:', id)
      await fetchStaff() // ✅ Ждем обновления данных перед закрытием модального окна
    } catch (e: any) {
      console.error('[Staff Admin] 💥 Критическая ошибка обновления участника состава:', e)
      setError(`Критическая ошибка: ${e.message}`)
    }
  }

  const handleDeleteStaff = async (id: string) => {
    const { error } = await supabase.from("staff").delete().eq("id", id)
    if (error) throw error
    fetchStaff()
  }

  // ✅ Обогащаем данные участников состава балансами, NFT counts и SOL балансами
  const enrichedStaff = staff.map(person => ({
    ...person,
    balance: balances[person.walletAddress] || 0,
    nftCount: nftCounts[person.walletAddress] || 0,
    solBalance: solBalances[person.walletAddress] || 0  // ✅ Добавляем SOL баланс
  }))

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-display font-bold">Manage Staff</h1>
          {/* ✅ Показываем загрузку для балансов, NFT counts и SOL балансов */}
          <div className="flex items-center space-x-4">
            {balancesLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                Loading balances...
              </div>
            )}
            {nftCountsLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
                <span>NFT остатки загружаются...</span>
              </div>
            )}
            {solBalancesLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span>SOL балансы загружаются...</span>
              </div>
            )}
          </div>
        </div>
        {error && <div className="text-red-500">{error}</div>}
        <EntityTable
          title="Staff Members"
          entities={enrichedStaff}
          entityType="staff"
          onCreateEntity={handleCreateStaff}
          onUpdateEntity={handleUpdateStaff}
          onDeleteEntity={handleDeleteStaff}
          extraColumns={[
            {
              key: "solBalance",
              label: "SOL Balance",
            },
            {
              key: "nftCount",
              label: "NFT",
            },
            {
              key: "walletAddress",
              label: "Wallet Address",
            },
          ]}
          showDescription={true}
          showBalance={true}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  )
}
