import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wallet, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { useSolBalance } from '@/hooks/use-sol-balance'
import { cn } from '@/lib/utils'

export function SolanaBalanceDisplay() {
  const { balance, isLoading, error, refetch } = useSolBalance()

  const getBalanceColor = (balance: number | null) => {
    if (balance === null) return 'bg-gray-100 text-gray-800'
    if (balance < 0.1) return 'bg-red-100 text-red-800 border-red-200'
    if (balance < 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getBalanceIcon = (balance: number | null) => {
    if (balance === null || balance < 0.1) return <AlertTriangle className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="px-4 py-2 text-sm bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Balance load error
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          className="h-8 w-8 p-0"
          title="Retry loading balance"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="secondary" 
        className={cn(
          "px-4 py-2 text-sm font-medium border cursor-help",
          getBalanceColor(balance)
        )}
        title={`Minting wallet: ${process.env.NEXT_PUBLIC_MINTING_WALLET || '5JbDcHSKkPnptsGKS7oZjir2FuALJURf5p9fqAPt4Z6t'}`}
      >
        <Wallet className="h-4 w-4 mr-2" />
        {isLoading ? (
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Loading...
          </span>
        ) : (
          <span className="flex items-center gap-1">
            {getBalanceIcon(balance)}
            {balance !== null ? `${balance.toFixed(4)} SOL` : 'N/A'}
          </span>
        )}
      </Badge>
      
      {!isLoading && (
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          className="h-8 w-8 p-0"
          title="Refresh balance"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
              )}
      </div>
  )
} 