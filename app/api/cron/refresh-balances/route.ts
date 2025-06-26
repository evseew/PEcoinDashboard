import { NextRequest, NextResponse } from 'next/server'
import { getCachedTokenBalances } from '@/lib/cached-token-balance'
import { getAlchemyKey } from '@/lib/alchemy/solana'
import { supabase } from '@/lib/supabaseClient' // ИСПРАВЛЕНО: правильный импорт клиента Supabase
import { serverCache } from '@/lib/server-cache' // ДОБАВЛЕНО: импорт для управления кэшем

// --- Типы ---
type DbWallet = { wallet_address: string | null };

// --- Константы ---
const PECOIN_MINT = "FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r";

/**
 * Этот эндпоинт предназначен для вызова через Vercel Cron Job.
 * Он принудительно обновляет кэш балансов всех участников экосистемы.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const authHeader = request.headers.get('authorization')

  // --- Безопасность ---
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('[CRON] 🚀 Начало фонового обновления балансов...')

  try {
    // 1. Принудительно очищаем старый кэш балансов
    const invalidatedCount = serverCache.invalidate('token-balance:')
    if (invalidatedCount > 0) {
      console.log(`[CRON] 🗑️ Очищено ${invalidatedCount} старых записей о балансах.`)
    }

    // 2. Получаем все кошельки из базы данных
    const wallets = await getAllWallets()
    if (wallets.length === 0) {
      console.log('[CRON] ⚠️ Не найдено ни одного кошелька для обновления.')
      return NextResponse.json({ success: true, message: 'No wallets to refresh.' })
    }
    
    console.log(`[CRON] 🏦 Найдено ${wallets.length} кошельков для обновления.`)

    // 3. Вызываем функцию для обновления кэша
    const apiKey = getAlchemyKey()
    const balances = await getCachedTokenBalances(wallets, PECOIN_MINT, apiKey) 
    
    const totalTime = Date.now() - startTime
    console.log(`[CRON] ✅ Фоновое обновление балансов завершено за ${totalTime}ms.`)
    console.log(`[CRON] 📊 Обновлено ${balances.size} балансов.`)

    return NextResponse.json({
      success: true,
      message: `Refreshed ${balances.size} balances in ${totalTime}ms.`,
      refreshedCount: balances.size,
      invalidatedCount,
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[CRON] ❌ Ошибка во время фонового обновления за ${totalTime}ms:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh token balances',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Вспомогательная функция для получения всех кошельков из БД.
 */
async function getAllWallets(): Promise<string[]> {
  const allWallets = new Set<string>()

  const { data: teams } = await supabase
    .from('teams')
    .select('wallet_address')
    .not('wallet_address', 'is', null)

  const { data: startups } = await supabase
    .from('startups')
    .select('wallet_address')
    .not('wallet_address', 'is', null)
    
  const { data: staff } = await supabase
    .from('staff')
    .select('wallet_address')
    .not('wallet_address', 'is', null)

  teams?.forEach((item: DbWallet) => item.wallet_address && allWallets.add(item.wallet_address))
  startups?.forEach((item: DbWallet) => item.wallet_address && allWallets.add(item.wallet_address))
  staff?.forEach((item: DbWallet) => item.wallet_address && allWallets.add(item.wallet_address))
  
  return Array.from(allWallets)
} 