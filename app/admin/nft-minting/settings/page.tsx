'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImportCollectionModal } from '@/components/admin/import-collection-modal'
import { toast } from '@/hooks/use-toast'
import { 
  Database, 
  FolderPlus, 
  Settings, 
  Palette, 
  ArrowLeft,
  ExternalLink,
  Copy,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'

export default function CollectionSettingsPage() {
  // Sample data для коллекций с расширенной информацией
  const collections = [
    {
      id: 1,
      name: "PEcamp Founders cNFT",
      treeAddress: "7xKXrW9mF2H8L3nN5d6aPqM1J4zR8vT9G2B5k7N3sQwE",
      capacity: 1024,
      minted: 87,
      depth: 10,
      leaves: 1024,
      status: "minting",
      createdAt: "2024-01-15",
      lastMint: "2024-01-20 14:30"
    },
    {
      id: 2,
      name: "Team Avatars v2",
      treeAddress: "9M3ScY1G7H2K5pP8qQ1r6B3n4M7J8vF2A5w9X2s3D4f6",
      capacity: 512,
      minted: 50,
      depth: 9,
      leaves: 512,
      status: "completed",
      createdAt: "2024-01-10",
      lastMint: "2024-01-18 16:45"
    },
    {
      id: 3,
      name: "Achievement Badges",
      treeAddress: "5N8Tb2H8K3M7pP1qQ5r9B6n2M4J7vF8A2w6X9s1D3f5",
      capacity: 2048,
      minted: 44,
      depth: 11,
      leaves: 2048,
      status: "active",
      createdAt: "2024-01-12",
      lastMint: "2024-01-19 10:15"
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Tree address copied to clipboard",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/nft-minting">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Minting
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                ⚙️ Collection Management
              </h1>
              <p className="text-lg text-gray-600">
                Import, configure and analyze compressed NFT collections
              </p>
            </div>
          </div>
        </div>

        {/* Import Collection Section */}
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-xl text-white mb-8">
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
                  className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold"
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
              }}
            />
          </CardContent>
        </Card>

        {/* Collections List */}
        <Card className="bg-white/80 backdrop-blur border-0 shadow-md mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              All Collections
            </CardTitle>
            <CardDescription>
              Complete list of imported collections with detailed information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {collections.map((collection) => (
                <Card key={collection.id} className="border">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{collection.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                            {collection.treeAddress}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(collection.treeAddress)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(collection.status)}`}>
                          {collection.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Capacity:</span>
                        <div className="font-semibold">{collection.capacity.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Minted:</span>
                        <div className="font-semibold">{collection.minted}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Tree depth:</span>
                        <div className="font-semibold">{collection.depth}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <div className="font-semibold">{collection.createdAt}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Last mint: {collection.lastMint}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Solscan
                        </Button>
                                                  <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Settings
                          </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tree Analytics */}
        <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Merkle Tree Analytics
            </CardTitle>
            <CardDescription>
              Technical information and statistics about collection trees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {collections.reduce((sum, c) => sum + c.capacity, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Capacity</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {collections.reduce((sum, c) => sum + c.minted, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Minted</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {collections.length}
                </div>
                <div className="text-sm text-gray-600">Active Collections</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 