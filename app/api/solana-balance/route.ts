import { NextRequest, NextResponse } from 'next/server'

const MINTING_WALLET_ADDRESS = process.env.NEXT_PUBLIC_MINTING_WALLET || '5JbDcHSKkPnptsGKS7oZjir2FuALJURf5p9fqAPt4Z6t'

export async function GET() {
  try {

    // Список RPC endpoints для fallback
    const rpcEndpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana'
    ]

    let lastError: Error | null = null

    // Пробуем разные RPC endpoints
    for (const rpcUrl of rpcEndpoints) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [MINTING_WALLET_ADDRESS]
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error.message)
        }

        if (typeof data.result?.value !== 'number') {
          throw new Error('Invalid response format')
        }

        // Конвертируем лампорты в SOL (1 SOL = 1e9 lamports)
        const balanceInSol = data.result.value / 1e9

        return NextResponse.json({
          success: true,
          data: {
            balance: balanceInSol,
            wallet: MINTING_WALLET_ADDRESS,
            timestamp: new Date().toISOString()
          }
        })
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        continue // Пробуем следующий endpoint
      }
    }

    // Если все endpoints не сработали
    throw lastError || new Error('All RPC endpoints failed')

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Balance fetch error'
      },
      { status: 500 }
    )
  }
} 