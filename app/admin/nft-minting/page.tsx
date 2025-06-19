'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SolanaBalanceDisplay } from '@/components/solana-balance-display'

import { Upload, History, Settings, Zap, Database, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'

// Последние добавления из истории минтинга - 3 самых свежих
const recentMintings = [
  {
    id: 'mint_001',
    timestamp: '2024-01-23 14:30:25',
    collection: 'PEcamp Founders cNFT',
    nftName: 'Founder Badge cNFT #47',
    recipient: '8K7R9mF2x3G4y1W5s6Q7t8P9u0V1w2X3y4Z5a6B7c8D9e0F1',
    status: 'completed',
    leafIndex: 47,
    timePassed: '2 minutes ago'
  },
  {
    id: 'mint_002',
    timestamp: '2024-01-23 14:29:18',
    collection: 'Team Avatars v2',
    nftName: 'Team Member cNFT #12',
    recipient: '9M3S1a2G7h8J4k5L6z7X8c9V0b1N2m3Q4w5E6r7T8y9U0i1O2p3',
    status: 'completed',
    leafIndex: 12,
    timePassed: '3 minutes ago'
  },
  {
    id: 'mint_003',
    timestamp: '2024-01-23 14:28:42',
    collection: 'Achievement Badges v2',
    nftName: 'Completion cNFT #156',
    recipient: '7L6K5j4H3g2F1d0S9a8P7o6I5u4Y3t2R1e0W9q8E7r6T5y4U3i2O1',
    status: 'processing',
    leafIndex: 156,
    timePassed: '4 minutes ago'
  }
]

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
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🗜️ Compressed NFT Minting
              </h1>
              <p className="text-lg text-gray-600">
                Manage and mint compressed NFT collections for PEcamp ecosystem
              </p>
            </div>
            <SolanaBalanceDisplay />
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
                Latest minting operations from all collections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-100">Last completed:</span>
                  <span className="font-semibold">2 minutes ago</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-100">Processing now:</span>
                  <span className="font-semibold">1 NFT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-100">Success rate:</span>
                  <span className="font-semibold">95.2%</span>
                </div>
              </div>
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
                  Three most recent NFT additions to collections
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
            <div className="space-y-4">
              {recentMintings.map((mint) => (
                <div key={mint.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(mint.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{mint.nftName}</h3>
                        <Badge variant="secondary" className="text-xs">
                          #{mint.leafIndex}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">Collection: {mint.collection}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {truncateAddress(mint.recipient)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {mint.timePassed}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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