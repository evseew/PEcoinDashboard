'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ImportCollectionModal } from '@/components/admin/import-collection-modal'
import { toast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2,
  Image as ImageIcon,
  Calendar,
  Users,
  Zap,
  MoreHorizontal,
  FolderPlus,
  Database,
  TreePine,
  Clock
} from 'lucide-react'

// Sample collections data - updated for compressed NFT workflow
const collections = [
  {
    id: '1',
    name: 'PEcamp Founders cNFT',
    description: 'Exclusive compressed NFTs for PEcamp founding members',
    treeAddress: '7xKXqR9mF2x3G4y1W5s6Q7t8P9u0V1w2X',
    totalCapacity: 1024,
    mintedNFTs: 98,
    queuedNFTs: 45,
    status: 'minting',
    createdAt: '2024-01-15',
    lastMinted: '2024-01-20',
    importedAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Achievement Badges v2',
    description: 'Recognition badges for various accomplishments',
    treeAddress: '9M3S1a2G7h8J4k5L6z7X8c9V0b1N2m3Q',
    totalCapacity: 2048,
    mintedNFTs: 244,
    queuedNFTs: 156,
    status: 'active',
    createdAt: '2024-01-10',
    lastMinted: '2024-01-18',
    importedAt: '2024-01-10'
  },
  {
    id: '3',
    name: 'Team Avatars v2',
    description: 'Custom compressed avatars for team members',
    treeAddress: '5N8T2b3H8g9M3s1A7q4R5e6W7t8Y9u0I',
    totalCapacity: 512,
    mintedNFTs: 50,
    queuedNFTs: 0,
    status: 'completed',
    createdAt: '2024-01-08',
    lastMinted: '2024-01-12',
    importedAt: '2024-01-08'
  },
  {
    id: '4',
    name: 'Seasonal Collection Winter',
    description: 'Limited edition seasonal compressed NFTs',
    treeAddress: '4G3F2d1S0a9P8o7I6u5Y4t3R2e1W0q9E',
    totalCapacity: 256,
    mintedNFTs: 0,
    queuedNFTs: 0,
    status: 'imported',
    createdAt: '2024-01-23',
    lastMinted: null,
    importedAt: '2024-01-23'
  }
]

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'active':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'minting':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'imported':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return '✅'
    case 'active':
      return '🟢'
    case 'minting':
      return '⚡'
    case 'imported':
      return '📁'
    default:
      return '❓'
  }
}

export default function CollectionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
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
                🗜️ Compressed NFT Collections
              </h1>
              <p className="text-lg text-gray-600">
                Manage imported collections and monitor minting status
              </p>
            </div>
            <ImportCollectionModal 
              trigger={
                <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600">
                  <FolderPlus className="h-5 w-5 mr-2" />
                  Import Collection
                </Button>
              }
              onImport={(collectionData) => {
                console.log('Collection imported:', collectionData)
                toast({
                  title: "Collection Imported Successfully! 🎉",
                  description: `${collectionData.name} is now available for compressed NFT minting`,
                })
                // TODO: Add to collections list or refresh data
              }}
            />
          </div>
        </div>

        {/* Import Instructions */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <TreePine className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-900 mb-2">Import Existing Collection</h3>
                <p className="text-emerald-700 text-sm mb-3">
                  Add a compressed NFT collection that was created locally with its Merkle tree address.
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                    Tree Address Required
                  </Badge>
                  <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                    Metadata URI
                  </Badge>
                  <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                    Collection Name
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur border-0 shadow-md mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search collections..."
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">All Status</Button>
                <Button variant="outline" size="sm">Active</Button>
                <Button variant="outline" size="sm">Minting</Button>
                <Button variant="outline" size="sm">Completed</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Link key={collection.id} href={`/admin/nft-minting/collections/${collection.id}`}>
              <Card className="bg-white/80 backdrop-blur border-0 shadow-md hover:shadow-lg transition-all cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                        <Database className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{collection.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {collection.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Tree Address */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TreePine className="h-4 w-4 text-gray-600" />
                      <span className="text-xs font-medium text-gray-600">Merkle Tree</span>
                    </div>
                    <p className="text-sm font-mono text-gray-900">{collection.treeAddress}</p>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className={`px-3 py-1 font-medium ${getStatusColor(collection.status)}`}>
                      {getStatusIcon(collection.status)} {collection.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Imported {collection.importedAt}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">{collection.totalCapacity}</p>
                      <p className="text-xs text-gray-600">Capacity</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{collection.mintedNFTs}</p>
                      <p className="text-xs text-gray-600">Minted</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-orange-600">{collection.queuedNFTs}</p>
                      <p className="text-xs text-gray-600">Queued</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Progress</span>
                      <span>{Math.round((collection.mintedNFTs / collection.totalCapacity) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${(collection.mintedNFTs / collection.totalCapacity) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {collection.status === 'imported' && (
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        <Zap className="h-4 w-4 mr-1" />
                        Start Minting
                      </Button>
                    )}
                    {collection.status === 'active' && (
                      <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700">
                        <Plus className="h-4 w-4 mr-1" />
                        Add NFTs
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {collections.length === 0 && (
          <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
            <CardContent className="p-12 text-center">
              <div className="mb-6">
                <Database className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Collections Imported</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Import your first compressed NFT collection to start minting. Make sure you have the Merkle tree address ready.
                </p>
              </div>
              <ImportCollectionModal 
                trigger={
                  <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600">
                    <FolderPlus className="h-5 w-5 mr-2" />
                    Import Your First Collection
                  </Button>
                }
                onImport={(collectionData) => {
                  console.log('First collection imported:', collectionData)
                  toast({
                    title: "First Collection Imported! 🎉",
                    description: `${collectionData.name} has been added. You can now start minting compressed NFTs!`,
                  })
                  // TODO: Update collections state or refresh page
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}