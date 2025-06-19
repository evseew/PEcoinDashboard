'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SolanaBalanceDisplay } from '@/components/solana-balance-display'

import { Upload, History, Settings, Zap, Database } from 'lucide-react'

export default function NFTMintingPage() {
  // Sample data for active collections
  const activeCollections = [
    {
      id: 1,
      name: "PEcamp Founders cNFT",
      treeAddress: "7xKXrW9mF2H8L3nN5d6aPqM1J4zR8vT9G2B5k7N3sQwE",
      capacity: 1024,
      minted: 87,
      queued: 45,
      status: "minting"
    },
    {
      id: 2,
      name: "Team Avatars v2",
      treeAddress: "9M3ScY1G7H2K5pP8qQ1r6B3n4M7J8vF2A5w9X2s3D4f6",
      capacity: 512,
      minted: 50,
      queued: 0,
      status: "completed"
    },
    {
      id: 3,
      name: "Achievement Badges",
      treeAddress: "5N8Tb2H8K3M7pP1qQ5r9B6n2M4J7vF8A2w6X9s1D3f5",
      capacity: 2048,
      minted: 44,
      queued: 156,
      status: "active"
    }
  ]

  function getStatusColor(status: string) {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'minting': return 'bg-blue-100 text-blue-800'
      case 'active': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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

          {/* Minting Stats */}
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-xl text-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Settings className="h-6 w-6" />
                Minting Statistics
              </CardTitle>
              <CardDescription className="text-blue-100">
                Overall efficiency and operation statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-100">Minted today:</span>
                  <span className="font-semibold">23 NFT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-100">Success rate:</span>
                  <span className="font-semibold">98.5%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-100">Avg. cost:</span>
                  <span className="font-semibold">0.002 SOL</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Collections */}
        <Card className="bg-white/80 backdrop-blur border-0 shadow-md mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Active Collections
                </CardTitle>
                <CardDescription>
                  Imported collections ready for compressed NFT minting
                </CardDescription>
              </div>
              <Link href="/admin/nft-minting/collections">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCollections.map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                      <Database className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{collection.name}</h3>
                      <p className="text-sm text-gray-600 font-mono">{collection.treeAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {collection.minted}/{collection.capacity} minted • {collection.queued} queued
                      </div>
                      <Badge className={`text-xs ${getStatusColor(collection.status)}`}>
                        {collection.status}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
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