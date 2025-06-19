import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  TreePine
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Compressed NFT Minting History - PEcamp Admin',
  description: 'View compressed NFT minting transaction history and logs'
}

// Sample history data - updated for compressed NFT
const mintingHistory = [
  {
    id: 'mint_001',
    timestamp: '2024-01-23 14:30:25',
    collection: 'PEcamp Founders cNFT',
    nftName: 'Founder Badge cNFT #47',
    recipient: '8K7R9mF2x3G4y1W5s6Q7t8P9u0V1w2X3y4Z5a6B7c8D9e0F1',
    status: 'completed',
    transactionHash: '5N8T2b3H8g9M3s1A7q4R5e6W7t8Y9u0I1o2P3a4S5d6F7g8H9j0K1',
    treeAddress: '7xKXqR9mF2x3G4y1W5s6Q7t8P9u0V1w2X',
    leafIndex: 47,
    cost: 0.00025, // Much cheaper for compressed NFTs
    confirmations: 432
  },
  {
    id: 'mint_002',
    timestamp: '2024-01-23 14:29:18',
    collection: 'Team Avatars v2',
    nftName: 'Team Member cNFT #12',
    recipient: '9M3S1a2G7h8J4k5L6z7X8c9V0b1N2m3Q4w5E6r7T8y9U0i1O2p3',
    status: 'completed',
    transactionHash: '6O9P3c4I9h0N4t6B8q5R6e7W8t9Y0u1I2o3P4a5S6d7F8g9H0j1L2',
    treeAddress: '5N8T2b3H8g9M3s1A7q4R5e6W7t8Y9u0I',
    leafIndex: 12,
    cost: 0.00025,
    confirmations: 428
  },
  {
    id: 'mint_003',
    timestamp: '2024-01-23 14:28:42',
    collection: 'Achievement Badges v2',
    nftName: 'Completion cNFT #156',
    recipient: '7L6K5j4H3g2F1d0S9a8P7o6I5u4Y3t2R1e0W9q8E7r6T5y4U3i2O1',
    status: 'processing',
    transactionHash: '7P0Q4d5J0i1O5u7C9r6S7f8G9h0J1k2L3m4N5b6V7c8X9z0A1s2D3',
    treeAddress: '9M3S1a2G7h8J4k5L6z7X8c9V0b1N2m3Q',
    leafIndex: 156,
    cost: 0.00025,
    confirmations: 12
  },
  {
    id: 'mint_004',
    timestamp: '2024-01-23 14:27:33',
    collection: 'Seasonal Collection Winter',
    nftName: 'Winter Special cNFT #89',
    recipient: '4G3F2d1S0a9P8o7I6u5Y4t3R2e1W0q9E8r7T6y5U4i3O2p1A0s9D8',
    status: 'failed',
    transactionHash: null,
    treeAddress: '4G3F2d1S0a9P8o7I6u5Y4t3R2e1W0q9E',
    leafIndex: null,
    cost: 0.00025,
    confirmations: 0,
    error: 'Tree capacity exceeded'
  },
  {
    id: 'mint_005',
    timestamp: '2024-01-23 14:26:15',
    collection: 'PEcamp Founders cNFT',
    nftName: 'Founder Badge cNFT #46',
    recipient: '2E1W0q9R8t7Y6u5I4o3P2a1S0d9F8g7H6j5K4l3M2n1B0v9C8x7Z6',
    status: 'completed',
    transactionHash: '8Q1R5e6K1l2M6o8D0s5F6g7H8j9K0l1M2n3B4v5C6x7Z8a9S0d1F2',
    treeAddress: '7xKXqR9mF2x3G4y1W5s6Q7t8P9u0V1w2X',
    leafIndex: 46,
    cost: 0.00025,
    confirmations: 456
  },
  {
    id: 'mint_006',
    timestamp: '2024-01-23 14:25:30',
    collection: 'Team Avatars v2',
    nftName: 'Team Member cNFT #11',
    recipient: '3F2X1z0A9s8D7f6G5h4J3k2L1m0N9b8V7c6X5z4A3s2D1f0G9h8J7',
    status: 'failed',
    transactionHash: null,
    treeAddress: '5N8T2b3H8g9M3s1A7q4R5e6W7t8Y9u0I',
    leafIndex: null,
    cost: 0.00025,
    confirmations: 0,
    error: 'Insufficient SOL balance'
  },
  {
    id: 'mint_007',
    timestamp: '2024-01-23 14:24:12',
    collection: 'Achievement Badges v2',
    nftName: 'Achievement cNFT #155',
    recipient: '5I4O3p2A1s0D9f8G7h6J5k4L3m2N1b0V9c8X7z6A5s4D3f2G1h0J9',
    status: 'failed',
    transactionHash: null,
    treeAddress: '9M3S1a2G7h8J4k5L6z7X8c9V0b1N2m3Q',
    leafIndex: null,
    cost: 0.00025,
    confirmations: 0,
    error: 'RPC timeout - network congestion'
  }
]

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
  const totalOperations = mintingHistory.length
  const completedOperations = mintingHistory.filter(op => op.status === 'completed').length
  const failedOperations = mintingHistory.filter(op => op.status === 'failed').length
  const processingOperations = mintingHistory.filter(op => op.status === 'processing').length
  const totalCost = mintingHistory.reduce((sum, op) => sum + op.cost, 0)
  const successRate = totalOperations > 0 ? (completedOperations / totalOperations * 100) : 0
  const avgCostPerMint = completedOperations > 0 ? (totalCost / totalOperations) : 0

  // Get today's operations for daily stats
  const today = new Date().toISOString().split('T')[0]
  const todayOperations = mintingHistory.filter(op => op.timestamp.startsWith(today))
  const todayCompleted = todayOperations.filter(op => op.status === 'completed').length
  const todayFailed = todayOperations.filter(op => op.status === 'failed').length
  const todayTotal = todayOperations.length

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
                Track all compressed NFT minting operations and transactions
              </p>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>





        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur border-0 shadow-md mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by NFT name or transaction..."
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">All Status</Button>
                <Button variant="outline" size="sm">Completed</Button>
                <Button variant="outline" size="sm">Processing</Button>
                <Button variant="outline" size="sm">Failed</Button>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Detailed log of all compressed NFT minting operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mintingHistory.map((transaction) => (
                <div key={transaction.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Database className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {transaction.nftName}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Collection: {transaction.collection}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{transaction.timestamp}</span>
                          {transaction.leafIndex !== null && (
                            <span>Leaf Index: #{transaction.leafIndex}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Compact Stats */}
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="font-semibold text-emerald-600">{successRate.toFixed(1)}%</span>
                        <span>Sent: {totalOperations}</span>
                        <span className="text-green-600">✓ {completedOperations}</span>
                        <span className="text-red-600">✗ {failedOperations}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={`px-3 py-1 ${getStatusColor(transaction.status)}`}>
                          {getStatusIcon(transaction.status)}
                          <span className="ml-2">{transaction.status.toUpperCase()}</span>
                        </Badge>
                        <span className="text-sm font-mono text-gray-600">
                          {transaction.cost} ◎
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tree Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TreePine className="h-4 w-4 text-gray-600" />
                        <span className="text-xs font-medium text-gray-600">Merkle Tree</span>
                      </div>
                      <p className="text-sm font-mono text-gray-900">
                        {truncateAddress(transaction.treeAddress)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="h-4 w-4 text-gray-600" />
                        <span className="text-xs font-medium text-gray-600">Recipient</span>
                      </div>
                      <p className="text-sm font-mono text-gray-900">
                        {truncateAddress(transaction.recipient)}
                      </p>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      {transaction.transactionHash && (
                        <div className="flex items-center gap-2">
                          <span>TX:</span>
                          <Link 
                            href={`https://explorer.solana.com/tx/${transaction.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-mono"
                          >
                            {truncateAddress(transaction.transactionHash)}
                            <ExternalLink className="inline h-3 w-3 ml-1" />
                          </Link>
                        </div>
                      )}
                      {transaction.confirmations > 0 && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{transaction.confirmations} confirmations</span>
                        </div>
                      )}
                    </div>
                    
                    {transaction.error && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{transaction.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing 1-{mintingHistory.length} of {mintingHistory.length} transactions
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 