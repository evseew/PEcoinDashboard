'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useNFTCollections } from '@/hooks/use-nft-collections'
import { useHybridNft } from '@/hooks/use-hybrid-nft'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Check, 
  ArrowLeft, 
  ArrowRight,
  FileImage,
  AlertCircle,
  Settings,
  Database,
  TreePine,
  Zap,
  Copy,
  Clock,
  RefreshCw,
  StopCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { validateNFTMetadata, logValidationResults, createValidNFTMetadata, NFTMetadata } from '@/lib/nft-validation'

interface UploadedFile {
  id: string
  file: File
  preview: string
  name: string
  recipient: string
  copies: number
  status: 'pending' | 'uploading' | 'minting' | 'uploaded' | 'error'
  error?: string
  progress?: number
  transactionHash?: string
}

interface MintingProgress {
  total: number
  completed: number
  failed: number
  current: string
  percentage: number
  startTime: number
  estimatedTimeLeft: number
}

// Используем импортированные утилиты из lib/nft-validation.ts

// Теперь используем реальные коллекции из базы данных

export default function NFTUploadPage() {
  const searchParams = useSearchParams()
  const preselectedCollectionId = searchParams.get('collection')
  
  // Загружаем реальные коллекции из базы данных
  const { collections, loading: collectionsLoading, getActiveCollections } = useNFTCollections()
  const { mintSingle } = useHybridNft()
  
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedCollection, setSelectedCollection] = useState(preselectedCollectionId || '')
  const [defaultRecipient, setDefaultRecipient] = useState('')
  const [defaultCopies, setDefaultCopies] = useState(1)
  const [isMinting, setIsMinting] = useState(false)
  const [mintingProgress, setMintingProgress] = useState<MintingProgress | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  // Удаляем неиспользуемую переменную - imageGatewayUrl теперь локальная в каждой итерации

  // Получаем только активные коллекции доступные для минтинга
  const availableCollections = getActiveCollections().filter(c => c.allow_minting)

  // Автоматически выбираем коллекцию из URL параметра
  useEffect(() => {
    if (preselectedCollectionId && availableCollections.find(c => c.id === preselectedCollectionId)) {
      setSelectedCollection(preselectedCollectionId)
    }
  }, [preselectedCollectionId, availableCollections])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const id = Math.random().toString(36).substr(2, 9)
        const preview = URL.createObjectURL(file)
        
        const newFile: UploadedFile = {
          id,
          file,
          preview,
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          recipient: defaultRecipient,
          copies: defaultCopies,
          status: 'pending',
          progress: 0
        }
        
        setUploadedFiles(prev => [...prev, newFile])
      }
    })
  }

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
  }

  const updateFile = (id: string, updates: Partial<UploadedFile>) => {
    setUploadedFiles(prev => 
      prev.map(f => f.id === id ? { ...f, ...updates } : f)
    )
  }

  const retryFile = (id: string) => {
    updateFile(id, { 
      status: 'pending', 
      error: undefined, 
      progress: 0 
    })
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  const cancelMinting = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
    setIsMinting(false)
    setMintingProgress(null)
    
    // Сбрасываем статусы файлов, которые еще минтятся
    setUploadedFiles(prev => 
      prev.map(f => 
        f.status === 'uploading' || f.status === 'minting' 
          ? { ...f, status: 'pending', progress: 0 }
          : f
      )
    )
  }

  const simulateMintingProcess = async () => {
    const controller = new AbortController()
    setAbortController(controller)
    setIsMinting(true)

    const validFiles = uploadedFiles.filter(f => f.recipient && f.status === 'pending')
    const totalNFTs = validFiles.reduce((sum, f) => sum + f.copies, 0)
    
    setMintingProgress({
      total: totalNFTs,
      completed: 0,
      failed: 0,
      current: '',
      percentage: 0,
      startTime: Date.now(),
      estimatedTimeLeft: 0
    })

    console.log('[NFTUpload] Начинаем реальный минтинг через гибридный API')
    console.log('[NFTUpload] Файлов для минтинга:', validFiles.length, 'Всего NFT:', totalNFTs)
    console.log('[NFTUpload] Выбранная коллекция:', selectedCollection)
    
    let processedCount = 0
    
    // Первый (устаревший) цикл обработки validFiles с созданием двойных JSON удалён
    // Оставлен только второй цикл ниже, который формирует корректный единственный JSON
    // Проверяем доступность коллекции на external API (сохраняем для совместимости)
    try {
      const collectionsResponse = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/api/collections`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_EXTERNAL_API_KEY || ''
        }
      })
      
      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json()
        console.log('[NFTUpload] Доступные коллекции на external API:', collectionsData)
        
        if (collectionsData.success && collectionsData.data?.collections) {
          const externalCollections = collectionsData.data.collections
          const collectionExists = externalCollections.find((c: any) => c.id === selectedCollection)
          
          if (!collectionExists) {
            console.warn('[NFTUpload] ВНИМАНИЕ: Коллекция не найдена на external API, используем internal fallback')
            console.log('[NFTUpload] Доступные external коллекции:', externalCollections.map((c: any) => ({ id: c.id, name: c.name })))
          }
        }
      }
    } catch (error) {
      console.warn('[NFTUpload] Не удалось проверить коллекции на external API:', error)
    }

    try {
      let processedNFTs = 0
      
      for (const file of validFiles) {
        if (controller.signal.aborted) break
        
        // Реальный минтинг для каждой копии
        for (let copyIndex = 0; copyIndex < file.copies; copyIndex++) {
          if (controller.signal.aborted) break
          
          const nftName = file.copies > 1 ? `${file.name} #${copyIndex + 1}` : file.name
          
          setMintingProgress(prev => prev ? {
            ...prev,
            current: nftName,
            percentage: Math.round((processedNFTs / totalNFTs) * 100)
          } : null)

          // Этап 1: Загрузка изображения на IPFS
          updateFile(file.id, { 
            status: 'uploading', 
            progress: 20 
          })
          
          setMintingProgress(prev => prev ? {
            ...prev,
            current: `📤 Uploading image ${nftName} to IPFS...`
          } : null)
          
          // Загрузка изображения на IPFS через external API (ИСПРАВЛЕНО)
          let imageUri = '';
          let imageGatewayUrl = '';
          let imageCid = '';
          try {
            const formData = new FormData()
            formData.append('image', file.file)  // ✅ ИСПРАВЛЕНО: правильное поле для /api/upload/image
            formData.append('name', nftName)     // ✅ ИСПРАВЛЕНО: добавляем имя файла
            
            const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/api/upload/image`, {
              method: 'POST',
              headers: {
                'x-api-key': process.env.NEXT_PUBLIC_EXTERNAL_API_KEY || ''
              },
              body: formData
            })
            
            const uploadResult = await uploadResponse.json()
            
            if (uploadResult.success && uploadResult.data) {
              imageUri = uploadResult.data.gatewayUrl || uploadResult.data.ipfsUri  // 🔥 КРИТИЧЕСКОЕ: используем Gateway URL для Phantom!
              imageGatewayUrl = uploadResult.data.gatewayUrl    // ✅ Gateway URL для браузера
              imageCid = uploadResult.data.ipfsHash             // ✅ IPFS hash
              console.log('[NFTUpload] ✅ Изображение загружено на IPFS:', {
                hash: imageCid,
                ipfsUri: uploadResult.data.ipfsUri,  // ✅ Показываем оригинальный ipfs://
                gatewayUrl: imageGatewayUrl,         // ✅ Gateway URL для браузера
                usedUri: imageUri,                   // 🔥 КРИТИЧЕСКОЕ: что мы используем в JSON
                uriType: imageUri.startsWith('https://') ? 'HTTPS Gateway' : 'IPFS Protocol',
                size: uploadResult.data.size
              })
            } else {
              throw new Error(uploadResult.error || 'Ошибка загрузки изображения')
            }
            
          } catch (uploadError: any) {
            console.error('[NFTUpload] ❌ Ошибка загрузки изображения на IPFS:', uploadError)
            updateFile(file.id, { 
              status: 'error', 
              error: `Ошибка загрузки изображения: ${uploadError.message}`,
              progress: 0 
            })
            continue
          }

          if (controller.signal.aborted) break

          // Этап 2: Создание и загрузка JSON метаданных на IPFS
          updateFile(file.id, { 
            status: 'uploading', 
            progress: 50 
          })
          
          setMintingProgress(prev => prev ? {
            ...prev,
            current: `📝 Creating metadata for ${nftName}...`
          } : null)

          // Получаем данные выбранной коллекции для корректных метаданных
          const selectedCollectionData = availableCollections.find(c => c.id === selectedCollection)
          
          // 🔥 PHANTOM WALLET ТРЕБУЕТ СПЕЦИФИЧЕСКИЙ ФОРМАТ НАЗВАНИЙ!
          const collectionName = selectedCollectionData?.name || 'PE Stickers'
          const formattedNftName = `${collectionName} #${nftName}`  // 🎯 PHANTOM СТАНДАРТ!
          
          let metadataUri = '';
          try {
            // ✅ КРИТИЧЕСКАЯ ВАЛИДАЦИЯ: Проверяем что imageUri заполнен!
            if (!imageUri || imageUri.trim() === '') {
              throw new Error('КРИТИЧЕСКАЯ ОШИБКА: imageUri пустой! Проверьте загрузку изображения.')
            }
            
            // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем валидированную утилиту создания метаданных
            
            const nftMetadata = createValidNFTMetadata({
              name: formattedNftName,  // 🔥 ИСПРАВЛЕНО: используем Phantom-совместимый формат
              symbol: selectedCollectionData?.symbol || "cNFT",
              description: selectedCollectionData?.description || `NFT from ${selectedCollectionData?.name || 'PEcamp'} collection: ${nftName}`,
              imageUri: imageUri,
              imageType: file.file.type || "image/png",
              attributes: [], // Можно добавить атрибуты если нужно
              externalUrl: selectedCollectionData?.external_url
            })
            
            // ✅ ПОЛНАЯ ВАЛИДАЦИЯ JSON МЕТАДАННЫХ
            const validation = validateNFTMetadata(nftMetadata)
            logValidationResults(validation, nftName)
            
            if (!validation.isValid) {
              console.error('[NFTUpload] ❌ ОШИБКИ ВАЛИДАЦИИ МЕТАДАННЫХ:', validation.errors)
              throw new Error(`Ошибки в структуре метаданных: ${validation.errors.join(', ')}`)
            }
            
            console.log('[NFTUpload] ✅ МЕТАДАННЫЕ ВАЛИДНЫ:', {
              name: nftMetadata.name,
              symbol: nftMetadata.symbol,
              sellerFeeBasisPoints: nftMetadata.seller_fee_basis_points,
              imageUri: nftMetadata.image,
              filesUri: nftMetadata.properties.files[0]?.uri,
              uriMatch: nftMetadata.image === nftMetadata.properties.files[0]?.uri,
              collection: selectedCollectionData?.name
            })

            // Загружаем JSON метаданные на IPFS
            const metadataResponse = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/api/upload/metadata`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.NEXT_PUBLIC_EXTERNAL_API_KEY || ''
              },
              body: JSON.stringify({
                metadata: nftMetadata,
                filename: `${nftName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-metadata.json`
              })
            })

            const metadataResult = await metadataResponse.json()

            if (metadataResult.success) {
              metadataUri = metadataResult.data.gatewayUrl || metadataResult.data.ipfsUri
              console.log('[NFTUpload] ✅ Метаданные загружены на IPFS:', {
                hash: metadataResult.data.ipfsHash,
                uri: metadataUri,
                metadata: nftMetadata
              })
            } else {
              throw new Error(metadataResult.error || 'Ошибка загрузки метаданных')
            }

          } catch (metadataError: any) {
            console.error('[NFTUpload] ❌ Ошибка загрузки метаданных на IPFS:', metadataError)
            updateFile(file.id, { 
              status: 'error', 
              error: `Ошибка загрузки метаданных: ${metadataError.message}`,
              progress: 0 
            })
            continue
          }
          
          if (controller.signal.aborted) break

          // Этап 3: Реальный минтинг через гибридный API
          updateFile(file.id, { 
            status: 'minting', 
            progress: 75 
          })
          
          setMintingProgress(prev => prev ? {
            ...prev,
            current: `⚡ Minting ${nftName} to blockchain...`
          } : null)
          
          try {
            console.log('[NFTUpload] Вызываем mintSingle для:', formattedNftName)  // 🔥 ОБНОВЛЕНО
            console.log('[NFTUpload] Данные для минтинга:', {
              collectionId: selectedCollection,
              recipient: file.recipient,
              metadata: {
                name: formattedNftName,  // 🔥 ИСПРАВЛЕНО: используем Phantom-совместимое название
                uri: metadataUri, // ← ИСПРАВЛЕНО: используем URI метаданных, а не изображения
                symbol: selectedCollectionData?.symbol || "cNFT",  // ✅ ИСПРАВЛЕНО: динамический символ
                description: `NFT from ${selectedCollectionData?.name || 'PEcamp'} collection: ${nftName}`  // ✅ ИСПРАВЛЕНО: динамическое имя
              }
            })
            
            // Маппинг между Supabase коллекциями и бэкенд коллекциями
            const collectionMapping = {
              '54333c2d-dd85-423d-bddd-aa0b1d903a08': 'pe-stickers', // PE Stickers
              // Добавим другие коллекции при необходимости
            }
            
            const backendCollectionId = collectionMapping[selectedCollection as keyof typeof collectionMapping] || 'pe-stickers'
            
            console.log('[NFTUpload] Маппинг коллекции:', selectedCollection, '→', backendCollectionId)
            
            const mintResult = await mintSingle({
              collectionId: backendCollectionId,
              recipient: file.recipient,
              metadata: {
                name: formattedNftName,  // 🔥 ИСПРАВЛЕНО: используем Phantom-совместимое название
                uri: metadataUri,  // ✅ URI на JSON метаданные
                symbol: selectedCollectionData?.symbol || "cNFT",  // ✅ ИСПРАВЛЕНО: динамический символ
                description: `NFT from ${selectedCollectionData?.name || 'PEcamp'} collection: ${nftName}`,
                // ✅ КРИТИЧЕСКОЕ: Передаем creators для правильного минтинга
                creators: [
                  {
                    address: selectedCollectionData?.creator_address || process.env.NEXT_PUBLIC_DEFAULT_CREATOR_ADDRESS || "A27VztuDLCA3FwnELbCnoGQW83Rk5xfrL7A79A8xbDTP",
                    share: 100,
                    verified: true
                  }
                ]
              }
            })

            if (mintResult.success) {
              console.log('[NFTUpload] NFT успешно заминтен:', mintResult.operationId)
              
              updateFile(file.id, { 
                status: 'uploaded', 
                progress: 100,
                transactionHash: mintResult.operationId || 'unknown'
              })
              
              setMintingProgress(prev => prev ? {
                ...prev,
                completed: prev.completed + 1
              } : null)
            } else {
              console.error('[NFTUpload] Ошибка минтинга:', mintResult.error)
              
              updateFile(file.id, { 
                status: 'error', 
                error: mintResult.error || `Failed to mint ${nftName}`,
                progress: 0 
              })
              
              setMintingProgress(prev => prev ? {
                ...prev,
                failed: prev.failed + 1
              } : null)
            }
            
          } catch (error: any) {
            console.error('[NFTUpload] Критическая ошибка минтинга:', error)
            
            updateFile(file.id, { 
              status: 'error', 
              error: error.message || `Failed to mint ${nftName}`,
              progress: 0 
            })
            
            setMintingProgress(prev => prev ? {
              ...prev,
              failed: prev.failed + 1
            } : null)
          }
          
          processedNFTs++
          
          // Обновляем общий прогресс и оценку времени
          const elapsed = (Date.now() - (mintingProgress?.startTime || Date.now())) / 1000
          const rate = processedNFTs / elapsed
          const remaining = totalNFTs - processedNFTs
          const estimatedTimeLeft = remaining / rate
          
          setMintingProgress(prev => prev ? {
            ...prev,
            percentage: Math.round((processedNFTs / totalNFTs) * 100),
            estimatedTimeLeft: estimatedTimeLeft
          } : null)
        }
      }
      
      // Завершение процесса
      if (!controller.signal.aborted) {
        setMintingProgress(prev => prev ? {
          ...prev,
          current: '🎉 Minting completed!',
          percentage: 100,
          estimatedTimeLeft: 0
        } : null)
        
        // Показываем финальный результат 3 секунды
        setTimeout(() => {
          setMintingProgress(null)
        }, 3000)
      }
      
    } catch (error) {
      console.error('[NFTUpload] Глобальная ошибка минтинга:', error)
      alert(`Ошибка минтинга: ${error}`)
    } finally {
      setIsMinting(false)
      setAbortController(null)
    }
  }

  const selectedCollectionData = availableCollections.find(c => c.id === selectedCollection)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ⚡ Add NFTs to Queue
          </h1>
          <p className="text-lg text-gray-600">
            Upload images and add them to an existing compressed NFT collection
          </p>
        </div>

        {/* Minting Progress Card */}
        {isMinting && mintingProgress && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Minting in Progress
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    {mintingProgress.current}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelMinting}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Main Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-blue-600">
                      {mintingProgress.percentage}%
                    </span>
                  </div>
                  <Progress value={mintingProgress.percentage} className="h-3" />
                </div>
                
                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {mintingProgress.total}
                    </div>
                    <div className="text-xs text-gray-600">Total NFTs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {mintingProgress.completed}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {mintingProgress.failed}
                    </div>
                    <div className="text-xs text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {mintingProgress.estimatedTimeLeft > 0 ? formatTime(mintingProgress.estimatedTimeLeft) : '~'}
                    </div>
                    <div className="text-xs text-gray-600">Time Left</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Collection Selection & Settings */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur border-0 shadow-md sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Minting Configuration
                </CardTitle>
                <CardDescription>
                  Select collection and configure minting parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Collection Selection */}
                <div>
                  <Label htmlFor="collection-select">Target Collection</Label>
                  <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {collectionsLoading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Загружаем коллекции...</span>
                          </div>
                        </SelectItem>
                      ) : availableCollections.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span>Нет активных коллекций</span>
                          </div>
                        </SelectItem>
                      ) : (
                        availableCollections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              <span>{collection.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {collection.minted}/{collection.capacity}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedCollectionData && (
                    <div className="mt-2 p-3 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TreePine className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-900">Selected Collection</span>
                      </div>
                      <p className="text-xs font-mono text-emerald-700 mb-2">
                        {selectedCollectionData.tree_address}
                      </p>
                      <div className="flex justify-between text-xs text-emerald-700">
                        <span>Capacity: {selectedCollectionData.capacity}</span>
                        <span>Minted: {selectedCollectionData.minted}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Hint to import collections if none available */}
                  {!collectionsLoading && availableCollections.length === 0 && (
                    <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">Нет доступных коллекций</span>
                      </div>
                      <p className="text-xs text-orange-700 mb-2">
                        Сначала импортируйте коллекцию для минтинга compressed NFT
                      </p>
                      <Link href="/admin/nft-minting/settings">
                        <Button size="sm" variant="outline" className="text-orange-700 border-orange-300 hover:bg-orange-100">
                          <Database className="h-3 w-3 mr-1" />
                          Импортировать коллекцию
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="default-recipient">Recipient Address</Label>
                  <Input
                    id="default-recipient"
                    placeholder="Solana wallet address"
                    value={defaultRecipient}
                    onChange={(e) => setDefaultRecipient(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Will be applied to all uploaded NFTs
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="default-copies" className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Copies Amount
                    </Label>
                    <Input
                      id="default-copies"
                      type="number"
                      min="1"
                      max="1000"
                      placeholder="1"
                      value={defaultCopies}
                      onChange={(e) => setDefaultCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Number of copies to mint for each NFT image
                  </p>
                </div>

                {/* Upload Stats */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ready to mint:</span>
                    <span className="font-semibold text-emerald-600">
                      {uploadedFiles.filter(f => f.status === 'pending' && f.recipient).length} images
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total NFTs to mint:</span>
                    <span className="font-semibold text-emerald-600">
                      {uploadedFiles.reduce((sum, f) => sum + (f.status === 'pending' && f.recipient ? f.copies : 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-semibold text-green-600">
                      {uploadedFiles.filter(f => f.status === 'uploaded').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Failed:</span>
                    <span className="font-semibold text-red-600">
                      {uploadedFiles.filter(f => f.status === 'error').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MAIN MINTING BUTTON */}
            <Card className="bg-white/80 backdrop-blur border-0 shadow-md mt-6">
              <CardContent className="p-6">
                <Button 
                  className={`w-full transition-all duration-200 ${
                    selectedCollection && uploadedFiles.filter(f => f.recipient && f.status === 'pending').length > 0 && !isMinting
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg transform hover:scale-105' 
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  size="lg" 
                  disabled={!selectedCollection || uploadedFiles.filter(f => f.recipient && f.status === 'pending').length === 0 || isMinting}
                  onClick={simulateMintingProcess}
                >
                  <Zap className={`h-5 w-5 mr-2 ${isMinting ? 'animate-spin' : ''}`} />
                  {isMinting 
                    ? 'Minting in Progress...' 
                    : uploadedFiles.length === 0
                      ? '⚡ Upload Images to Start Minting'
                      : selectedCollection && uploadedFiles.filter(f => f.recipient && f.status === 'pending').length > 0
                        ? `🚀 Start Minting ${uploadedFiles.reduce((sum, f) => sum + (f.status === 'pending' && f.recipient ? f.copies : 0), 0)} NFTs`
                        : !selectedCollection 
                          ? '⚡ Select Collection to Start Minting'
                          : '⚡ Add Recipients to Start Minting'
                  }
                </Button>
                
                {/* Status hint */}
                <p className="text-xs text-gray-500 text-center mt-3">
                  {uploadedFiles.length === 0
                    ? 'Upload some images to get started'
                    : !selectedCollection 
                      ? 'Choose a collection from the left panel to continue'
                      : uploadedFiles.filter(f => f.recipient && f.status === 'pending').length === 0
                        ? 'Fill recipient wallet addresses for your NFTs'
                        : `Ready to mint ${uploadedFiles.reduce((sum, f) => sum + (f.status === 'pending' && f.recipient ? f.copies : 0), 0)} NFTs!`
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Upload Area & File List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Zone */}
            <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
              <CardContent className="p-8">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-300 hover:border-purple-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto mb-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {uploadedFiles.length === 0 ? 'Upload NFT Images' : 'Add More Images'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {uploadedFiles.length === 0 
                      ? 'Drag and drop your images here, or click to browse'
                      : 'Upload additional images for your collection'
                    }
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className={
                      `inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium
                      cursor-pointer hover:bg-gray-50 ${isMinting ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <FileImage className="h-4 w-4 mr-2" />
                    {uploadedFiles.length === 0 ? 'Choose Files' : 'Add More Files'}
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Supports: JPG, PNG, GIF, WebP (max 10MB each)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Uploaded Images ({uploadedFiles.length})
                  </CardTitle>
                  <CardDescription>
                    Review and configure your NFT metadata and copies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="NFT Name"
                              value={file.name}
                              onChange={(e) => updateFile(file.id, { name: e.target.value })}
                              className="text-sm flex-1"
                              disabled={isMinting}
                            />
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-gray-600 whitespace-nowrap">Копий:</Label>
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={file.copies}
                                onChange={(e) => updateFile(file.id, { copies: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="w-20 text-sm text-center"
                                placeholder="1"
                                disabled={isMinting}
                              />
                            </div>
                            
                            {/* Status Icon */}
                            <div className="flex items-center gap-1 min-w-[24px]">
                              {file.status === 'pending' && <Clock className="h-4 w-4 text-gray-500" />}
                              {file.status === 'uploading' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                              {file.status === 'minting' && <Zap className="h-4 w-4 text-purple-500 animate-pulse" />}
                              {file.status === 'uploaded' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {file.status === 'error' && (
                                <div className="flex items-center gap-1">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => retryFile(file.id)}
                                    className="h-6 px-2 text-xs"
                                    disabled={isMinting}
                                  >
                                    Retry
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Recipient wallet address"
                              value={file.recipient}
                              onChange={(e) => updateFile(file.id, { recipient: e.target.value })}
                              className="text-xs font-mono flex-1"
                              disabled={isMinting}
                            />
                            {file.copies > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {file.copies} copies = {file.copies} NFTs
                              </Badge>
                            )}
                          </div>
                          
                          {/* Progress Bar for individual file */}
                          {(file.status === 'uploading' || file.status === 'minting') && file.progress !== undefined && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                  {file.status === 'uploading' ? '📤 Uploading to IPFS...' : '⚡ Minting to blockchain...'}
                                </span>
                                <span className="text-gray-600">{file.progress}%</span>
                              </div>
                              <Progress value={file.progress} className="h-1" />
                            </div>
                          )}
                          
                          {/* Error Message */}
                          {file.status === 'error' && file.error && (
                            <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-xs text-red-700">
                              <AlertCircle className="h-3 w-3" />
                              <span>{file.error}</span>
                            </div>
                          )}
                          
                          {/* Success Message */}
                          {file.status === 'uploaded' && (
                            <div className="flex items-center gap-2 p-2 bg-green-50 rounded text-xs text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              <span>Successfully minted {file.copies} NFT{file.copies > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="text-red-500 hover:text-red-700"
                          disabled={isMinting && (file.status === 'uploading' || file.status === 'minting')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Batch Actions */}
                  <div className="mt-6 flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedFiles(prev => 
                          prev.map(f => ({ ...f, recipient: defaultRecipient }))
                        )
                      }}
                      disabled={!defaultRecipient || isMinting}
                    >
                      Apply Recipient to All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedFiles(prev => 
                          prev.map(f => ({ ...f, copies: defaultCopies }))
                        )
                      }}
                      disabled={isMinting}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Apply Copies to All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedFiles(prev => 
                          prev.map(f => ({ 
                            ...f, 
                            recipient: defaultRecipient,
                            copies: defaultCopies 
                          }))
                        )
                      }}
                      disabled={!defaultRecipient || isMinting}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Apply All Settings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadedFiles([])}
                      className="text-red-600 hover:text-red-700"
                      disabled={isMinting}
                    >
                      Clear All
                    </Button>
                    
                    {/* Retry Failed Button */}
                    {uploadedFiles.some(f => f.status === 'error') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUploadedFiles(prev => 
                            prev.map(f => 
                              f.status === 'error' 
                                ? { ...f, status: 'pending', error: undefined, progress: 0 }
                                : f
                            )
                          )
                        }}
                        className="text-blue-600 hover:text-blue-700"
                        disabled={isMinting}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry Failed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {uploadedFiles.length === 0 && (
              <Card className="bg-white/80 backdrop-blur border-0 shadow-md">
                <CardContent className="p-8 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Upload</h3>
                  <p className="text-gray-600 mb-4">
                    Use the upload area above to start adding compressed NFT images
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• You can set individual copy amounts for each image</p>
                    <p>• Each copy will create a separate NFT in the collection</p>
                    <p>• All copies will use the same metadata and image</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}