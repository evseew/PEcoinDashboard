'use client'

import { useState, useEffect } from 'react'
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
  Copy,
  Trash2,
  ImageIcon,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'
import Link from 'next/link'

interface NFTCollection {
  id: string
  name: string
  description: string
  symbol: string
  tree_address: string
  collection_address?: string
  creator_address?: string
  capacity: number
  minted: number
  depth?: number
  buffer_size?: number
  image_url?: string
  external_url?: string
  metadata_json?: any
  has_valid_tree: boolean
  supports_das: boolean
  rpc_used?: string
  status: 'active' | 'paused' | 'completed'
  is_public: boolean
  allow_minting: boolean
  created_at: string
  updated_at: string
  imported_at: string
  last_sync_at?: string
}

export default function CollectionSettingsPage() {
  const [collections, setCollections] = useState<NFTCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загрузка коллекций из базы данных
  const fetchCollections = async () => {
    try {
      console.log('[Collections] Загружаем коллекции из базы...')
      const response = await fetch('/api/nft-collection')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Не удалось загрузить коллекции')
      }
      
      setCollections(data.collections || [])
      setError(null)
      console.log(`[Collections] Загружено ${data.collections?.length || 0} коллекций`)
      
    } catch (err: any) {
      console.error('[Collections] Ошибка загрузки:', err)
      setError(err.message || 'Не удалось загрузить коллекции')
      setCollections([])
    }
  }

  // Обновление данных коллекции из блокчейна
  const refreshCollectionData = async (treeAddress: string) => {
    setRefreshing(true)
    try {
      console.log(`[RefreshCollection] Обновляем данные для ${treeAddress}`)
      
      // Получаем свежие данные из блокчейна
      const fetchResponse = await fetch('/api/nft-collection/fetch-tree-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treeAddress })
      })
      
      if (!fetchResponse.ok) {
        throw new Error('Не удалось получить данные из блокчейна')
      }
      
      const fetchData = await fetchResponse.json()
      
      if (!fetchData.success) {
        throw new Error(fetchData.error || 'Ошибка получения данных')
      }

      console.log(`[RefreshCollection] Полученные данные из блокчейна:`, {
        name: fetchData.collection.name,
        minted: fetchData.collection.minted,
        capacity: fetchData.collection.capacity,
        hasValidTree: fetchData.collection.hasValidTree
      })
      
      // Обновляем коллекцию в базе данных
      const collection = collections.find(c => c.tree_address === treeAddress)
      if (!collection) {
        throw new Error('Коллекция не найдена')
      }
      
      const updateResponse = await fetch('/api/nft-collection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: collection.id,
          name: fetchData.collection.name, // Обновляем название коллекции
          description: fetchData.collection.description || collection.description,
          symbol: fetchData.collection.symbol || collection.symbol,
          image_url: fetchData.collection.image || collection.image_url,
          creator_address: fetchData.collection.creator || collection.creator_address,
          minted: fetchData.collection.minted,
          capacity: fetchData.collection.capacity,
          has_valid_tree: fetchData.collection.hasValidTree,
          supports_das: fetchData.collection.supportsDAS,
          rpc_used: fetchData.collection.rpcUsed,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      })
      
      if (!updateResponse.ok) {
        throw new Error('Не удалось обновить коллекцию в базе')
      }
      
      // Перезагружаем список коллекций
      await fetchCollections()
      
      console.log(`[RefreshCollection] ✅ Обновление завершено для ${collection.name}`)
      
      toast({
        title: "Данные обновлены! ✅",
        description: `Коллекция "${collection.name}" синхронизирована с блокчейном`,
      })
      
    } catch (err: any) {
      console.error('[RefreshCollection] Ошибка:', err)
      toast({
        title: "Ошибка обновления",
        description: err.message || 'Не удалось обновить данные коллекции',
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Удаление коллекции
  const deleteCollection = async (id: string, name: string) => {
    if (!confirm(`Вы уверены, что хотите удалить коллекцию "${name}"?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/nft-collection?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Не удалось удалить коллекцию')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Ошибка удаления')
      }
      
      // Обновляем список
      await fetchCollections()
      
      toast({
        title: "Коллекция удалена",
        description: data.message,
      })
      
    } catch (err: any) {
      console.error('[DeleteCollection] Ошибка:', err)
      toast({
        title: "Ошибка удаления",
        description: err.message,
        variant: "destructive"
      })
    }
  }

  // Загрузка при монтировании компонента
  useEffect(() => {
    const loadCollections = async () => {
      setLoading(true)
      await fetchCollections()
      setLoading(false)
    }
    
    loadCollections()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Скопировано!",
      description: "Tree address скопирован в буфер обмена",
    })
  }

  // Generate unique colors for collection icons based on name
  const getCollectionIconColors = (name: string) => {
    const colorSets = [
      { bg: 'from-purple-100 to-blue-100', text: 'text-purple-600' },
      { bg: 'from-green-100 to-emerald-100', text: 'text-green-600' },
      { bg: 'from-orange-100 to-red-100', text: 'text-orange-600' },
      { bg: 'from-pink-100 to-rose-100', text: 'text-pink-600' },
      { bg: 'from-indigo-100 to-purple-100', text: 'text-indigo-600' },
      { bg: 'from-teal-100 to-cyan-100', text: 'text-teal-600' },
    ]
    const index = name.length % colorSets.length
    return colorSets[index]
  }

  // Обработчик успешного импорта
  const handleCollectionImport = async (collectionData: any) => {
    console.log('Collection imported:', collectionData)
    
    // Перезагружаем список коллекций
    await fetchCollections()
    
    toast({
      title: "Коллекция импортирована! 🎉",
      description: `"${collectionData.name}" готова для compressed NFT минтинга`,
    })
  }

  // Получение статуса коллекции
  const getStatusBadge = (collection: NFTCollection) => {
    if (!collection.has_valid_tree) {
      return <Badge variant="destructive" className="ml-2">Недоступна</Badge>
    }
    if (collection.status === 'completed') {
      return <Badge variant="secondary" className="ml-2">Завершена</Badge>
    }
    if (collection.status === 'paused') {
      return <Badge variant="outline" className="ml-2">Приостановлена</Badge>
    }
    return <Badge variant="default" className="ml-2 bg-green-600">Активна</Badge>
  }

  // Прогресс заполнения
  const getProgressPercentage = (minted: number, capacity: number) => {
    return Math.round((minted / capacity) * 100)
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
                Назад к минтингу
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                ⚙️ Управление коллекциями
              </h1>
              <p className="text-lg text-gray-600">
                Импорт, настройка и анализ compressed NFT коллекций
              </p>
            </div>
            
            {/* Refresh Button */}
            <Button
              onClick={fetchCollections}
              disabled={loading || refreshing}
              variant="outline"
              className="gap-2"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Обновить
            </Button>
          </div>
        </div>

        {/* Import Collection Section */}
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-xl text-white mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <FolderPlus className="h-6 w-6" />
              Импорт коллекции
            </CardTitle>
            <CardDescription className="text-emerald-100">
              Добавьте существующую compressed NFT коллекцию по tree address
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
                  Импортировать коллекцию
                </Button>
              }
              onImport={handleCollectionImport}
            />
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="bg-red-50 border-red-200 mb-8">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Ошибка загрузки:</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading ? (
          <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-lg text-gray-600">Загружаем коллекции...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Collections List */
          <Card className="bg-white/80 backdrop-blur border-0 shadow-md mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Все коллекции ({collections.length})
              </CardTitle>
              <CardDescription>
                Полный список импортированных коллекций с детальной информацией
              </CardDescription>
            </CardHeader>
            <CardContent>
              {collections.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Коллекций пока нет</h3>
                  <p className="text-gray-500">Импортируйте первую коллекцию чтобы начать работу</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {collections.map((collection) => (
                    <Card key={collection.id} className="border">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          {/* Collection Icon */}
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {collection.image_url ? (
                              <img 
                                src={collection.image_url} 
                                alt={collection.name}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  // Fallback к генерированной иконке при ошибке загрузки
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const fallback = target.nextElementSibling as HTMLElement
                                  if (fallback) fallback.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full bg-gradient-to-br ${getCollectionIconColors(collection.name).bg} rounded-lg flex items-center justify-center ${collection.image_url ? 'hidden' : 'flex'}`}
                            >
                              <ImageIcon className={`h-5 w-5 ${getCollectionIconColors(collection.name).text}`} />
                            </div>
                          </div>
                          
                          {/* Collection Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold">{collection.name}</h3>
                              {getStatusBadge(collection)}
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono truncate">
                                {collection.tree_address}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(collection.tree_address)}
                                className="h-6 w-6 p-0 flex-shrink-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            {collection.description && (
                              <p className="text-sm text-gray-600 mt-1">{collection.description}</p>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Refresh Button */}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => refreshCollectionData(collection.tree_address)}
                              disabled={refreshing}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                            >
                              {refreshing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            
                            {/* Delete Button */}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteCollection(collection.id, collection.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Collection Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Capacity:</span>
                            <span className="ml-2 font-medium">{collection.capacity.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Заминчено:</span>
                            <span className="ml-2 font-medium">{collection.minted.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Заполнено:</span>
                            <span className="ml-2 font-medium">{getProgressPercentage(collection.minted, collection.capacity)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Symbol:</span>
                            <span className="ml-2 font-medium">{collection.symbol}</span>
                          </div>
                        </div>
                        
                        {/* Technical Info */}
                        <div className="mt-3 pt-3 border-t text-xs text-gray-500 flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            {collection.supports_das ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-orange-500" />
                            )}
                            <span>DAS API: {collection.supports_das ? 'Поддерживается' : 'Недоступно'}</span>
                          </div>
                          {collection.last_sync_at && (
                            <div>
                              Последняя синхронизация: {new Date(collection.last_sync_at).toLocaleString('ru-RU')}
                            </div>
                          )}
                          <div>
                            Импортирована: {new Date(collection.imported_at).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 