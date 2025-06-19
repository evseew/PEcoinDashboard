'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImportCollectionModal } from '@/components/admin/import-collection-modal'

import { toast } from '@/hooks/use-toast'
import { Upload, Palette, History, Settings, Plus, Image, Zap, FolderPlus, Database } from 'lucide-react'

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
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              ⚡ Powered by Solana cNFT
            </Badge>
          </div>
        </div>



        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Import Collection */}
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-xl text-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <FolderPlus className="h-6 w-6" />
                Import Collection
              </CardTitle>
              <CardDescription className="text-emerald-100">
                Add an existing compressed NFT collection from local setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportCollectionModal 
                trigger={
                  <Button 
                    size="lg" 
                    className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-semibold"
                  >
                    <Database className="h-5 w-5 mr-2" />
                    Import Collection
                  </Button>
                }
                onImport={(collectionData) => {
                  console.log('Collection imported:', collectionData)
                  toast({
                    title: "Collection Imported",
                    description: "The collection has been successfully imported and added to your library.",
                  })
                  // TODO: Add to global state or refresh data
                }}
              />
            </CardContent>
          </Card>

          {/* Mint NFTs */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl text-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Zap className="h-6 w-6" />
                Mint cNFTs
              </CardTitle>
              <CardDescription className="text-purple-100">
                Add NFTs to minting queue from imported collections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/nft-minting/upload">
                <Button 
                  size="lg" 
                  className="w-full bg-white text-purple-600 hover:bg-purple-50 font-semibold"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Add to Queue
                </Button>
              </Link>
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
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/nft-minting/history">
            <Card className="bg-white/80 backdrop-blur border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <History className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <h3 className="font-semibold text-gray-900 mb-1">Minting History</h3>
                <p className="text-sm text-gray-600">View transaction logs</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <Settings className="h-8 w-8 mx-auto mb-3 text-gray-600" />
              <h3 className="font-semibold text-gray-900 mb-1">Collection Settings</h3>
              <p className="text-sm text-gray-600">Configure parameters</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <Palette className="h-8 w-8 mx-auto mb-3 text-gray-600" />
              <h3 className="font-semibold text-gray-900 mb-1">Tree Analytics</h3>
              <p className="text-sm text-gray-600">Merkle tree insights</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 