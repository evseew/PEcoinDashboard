'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SolanaBalanceDisplay } from '@/components/solana-balance-display'
import { useMintHistory } from '@/hooks/use-mint-history'
import { useAuth } from '@/components/auth/auth-provider'

import { Upload, History, Settings, Zap, Database, CheckCircle, RefreshCw, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'processing':
      return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-600" />
    default:
      return null
  }
}

function truncateAddress(address: string) {
  if (!address) return 'N/A'
  return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`
}

export default function NFTMintingPage() {
  const { isAdmin } = useAuth()
  
  // Загружаем реальные данные истории минтинга (авто-обновление встроено в хук)
  const { operations, statistics, loading, error, refresh, getRecentOperations } = useMintHistory({ 
    limit: 3
  })
  
  // Получаем последние 3 операции
  const recentMintings = getRecentOperations(3)
  
  // Вычисляем статистику из реальных данных
  const lastCompletedTime = recentMintings.find(op => op.status === 'completed')?.timePassed || 'Нет данных'
  const processingCount = operations.filter(op => op.status === 'processing').length
  const successRate = statistics?.successRate || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🗜️ Compressed NFT Minting
              </h1>
              <p className="text-lg text-gray-600">
                Manage and mint compressed NFT collections for PEcamp ecosystem
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && <SolanaBalanceDisplay />}
            </div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Mint NFTs */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl text-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Zap className="h-6 w-6" />
                Mint cNFTs
              </CardTitle>
              <CardDescription className="text-purple-100">
                Create and mint compressed NFTs from uploaded collections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/nft-minting/upload">
                <Button 
                  size="lg" 
                  className="w-full bg-white text-purple-600 hover:bg-purple-50 font-semibold"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Start Minting
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Minting Statistics */}
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-xl text-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Settings className="h-6 w-6" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-blue-100">
                Real-time statistics from minting operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-100">Last completed:</span>
                    <span className="font-semibold">{lastCompletedTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-100">Processing now:</span>
                    <span className="font-semibold">{processingCount} NFT{processingCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-100">Success rate:</span>
                    <span className="font-semibold">{successRate}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Latest Minting Activity */}
        <Card className="bg-white/80 backdrop-blur border-0 shadow-md mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Latest Minting Activity
                </CardTitle>
                <CardDescription>
                  Real-time data from recent minting operations
                  <span className="block text-xs text-gray-400 mt-1">
                    ↻ Auto-refreshes every 30s when operations are active
                  </span>
                </CardDescription>
              </div>
              <Link href="/admin/nft-minting/history">
                <Button variant="outline" size="sm">
                  View All History
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">Загружаем историю...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
              </div>
            ) : recentMintings.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Database className="h-8 w-8 mr-3 text-gray-400" />
                <div className="text-center">
                  <p className="font-medium">Нет данных минтинга</p>
                  <p className="text-sm">Операции минтинга появятся здесь после их выполнения</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMintings.map((operation) => (
                  <div key={operation.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {getStatusIcon(operation.status)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">
                            {operation.type === 'batch' 
                              ? `Batch: ${operation.totalItems} NFTs` 
                              : operation.nftName || 'Single NFT'
                            }
                          </h3>
                          {operation.leafIndex && (
                            <Badge variant="secondary" className="text-xs">
                              #{operation.leafIndex}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {operation.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 truncate">Collection: {operation.collection}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        {operation.recipient && (
                          <div className="text-sm text-gray-600">
                            {truncateAddress(operation.recipient)}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {operation.timePassed}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin/nft-minting/history">
            <Card className="bg-white/80 backdrop-blur border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <History className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <h3 className="font-semibold text-gray-900 mb-1">Minting History</h3>
                <p className="text-sm text-gray-600">Transaction logs and efficiency</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/nft-minting/settings">
            <Card className="bg-white/80 backdrop-blur border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Settings className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <h3 className="font-semibold text-gray-900 mb-1">Collection Management</h3>
                <p className="text-sm text-gray-600">Import and configure collections</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
} 