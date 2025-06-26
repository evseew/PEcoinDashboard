'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMintHistory } from '@/hooks/use-mint-history'
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Wallet,
  Image as ImageIcon,
  Database,
  TreePine,
  Loader2,
  X
} from 'lucide-react'

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4" />
    case 'processing':
      return <RefreshCw className="h-4 w-4 animate-spin" />
    case 'failed':
      return <AlertCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

function truncateAddress(address: string) {
  if (!address) return 'N/A'
  return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`
}

export default function HistoryPage() {
  // Состояния для фильтрации
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Загружаем реальные данные истории минтинга
  const { 
    operations, 
    statistics, 
    loading, 
    error, 
    refresh, 
    updateFilters, 
    clearFilters
  } = useMintHistory({ 
    limit: 100,
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { type: typeFilter })
  })

  // Фильтрация по поисковому запросу
  const filteredOperations = operations.filter(op => {
    if (!searchTerm) return true
    
    const search = searchTerm.toLowerCase()
    return (
      op.collection.toLowerCase().includes(search) ||
      op.operationId.toLowerCase().includes(search) ||
      (op.nftName && op.nftName.toLowerCase().includes(search)) ||
      (op.recipient && op.recipient.toLowerCase().includes(search))
    )
  })

  // Статистика из реальных данных
  const totalOperations = statistics?.total || 0
  const completedOperations = statistics?.completed || 0
  const failedOperations = statistics?.failed || 0
  const processingOperations = statistics?.processing || 0
  const totalCost = statistics?.totalCost || 0
  const successRate = statistics?.successRate || 0
  const avgCostPerMint = statistics?.avgCostPerMint || 0

  // Статистика за сегодня
  const todayCompleted = statistics?.today?.completed || 0
  const todayFailed = statistics?.today?.failed || 0
  const todayTotal = statistics?.today?.total || 0

  // Обработчики фильтров
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value)
    updateFilters({ status: value === 'all' ? undefined : value })
  }

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value === 'all' ? '' : value)
    updateFilters({ type: value === 'all' ? undefined : value })
  }

  const handleClearFilters = () => {
    setStatusFilter('')
    setTypeFilter('')
    setSearchTerm('')
    clearFilters()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/nft-minting">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📜 Compressed NFT History
              </h1>
              <p className="text-lg text-gray-600">
                Real-time tracking of all compressed NFT minting operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Operations</p>
                  <p className="text-2xl font-bold text-gray-900">{totalOperations}</p>
                </div>
                <Database className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">{successRate}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Operations</p>
                  <p className="text-2xl font-bold text-blue-600">{todayTotal}</p>
                  <p className="text-xs text-gray-500">
                    ✅ {todayCompleted} ❌ {todayFailed}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-purple-600">{totalCost.toFixed(5)} SOL</p>
                  <p className="text-xs text-gray-500">Avg: {avgCostPerMint.toFixed(5)} SOL</p>
                </div>
                <Wallet className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur border-0 shadow-md mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search operations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
                <Select value={typeFilter || 'all'} onValueChange={handleTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="single">Single NFT</SelectItem>
                    <SelectItem value="batch">Batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operations List */}
        <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Operations History
            </CardTitle>
            <CardDescription>
              Showing {filteredOperations.length} of {totalOperations} operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500 mr-3" />
                <span className="text-gray-500">Загружаем историю операций...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-red-600">
                <AlertCircle className="h-8 w-8 mr-3" />
                <div className="text-center">
                  <p className="font-medium">Ошибка загрузки истории</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            ) : filteredOperations.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Database className="h-12 w-12 mr-4 text-gray-400" />
                <div className="text-center">
                  <p className="font-medium text-lg">Нет данных для отображения</p>
                  <p className="text-sm">Попробуйте изменить фильтры или проверьте позже</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOperations.map((operation) => (
                  <div key={operation.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {getStatusIcon(operation.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {operation.type === 'batch' 
                                ? `Batch: ${operation.totalItems} NFTs` 
                                : operation.nftName || 'Single NFT'
                              }
                            </h3>
                            <Badge className={getStatusColor(operation.status)}>
                              {operation.status}
                            </Badge>
                            <Badge variant="outline">
                              {operation.type}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-1">Collection: {operation.collection}</p>
                          <p className="text-sm text-gray-500 font-mono">ID: {operation.operationId}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{operation.timePassed}</p>
                        <p>{new Date(operation.timestamp).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {operation.recipient && (
                        <div>
                          <span className="text-gray-600">Recipient:</span>
                          <p className="font-mono">{truncateAddress(operation.recipient)}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Cost:</span>
                        <p className="font-semibold">{operation.cost.toFixed(5)} SOL</p>
                      </div>
                      {operation.confirmations > 0 && (
                        <div>
                          <span className="text-gray-600">Confirmations:</span>
                          <p className="font-semibold">{operation.confirmations}</p>
                        </div>
                      )}
                      {operation.type === 'batch' && (
                        <div>
                          <span className="text-gray-600">Progress:</span>
                          <p className="font-semibold">
                            {operation.successfulItems || 0}/{operation.totalItems || 0}
                            {operation.failedItems && operation.failedItems > 0 && (
                              <span className="text-red-600 ml-1">({operation.failedItems} failed)</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {operation.error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">
                          <span className="font-medium">Error:</span> {operation.error}
                        </p>
                      </div>
                    )}

                    {operation.transactionHash && (
                      <div className="mt-4 flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on Solscan
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 