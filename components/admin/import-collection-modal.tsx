'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  FolderPlus, 
  TreePine, 
  Database, 
  AlertCircle, 
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  Zap
} from 'lucide-react'

interface ImportCollectionModalProps {
  trigger?: React.ReactNode
  onImport?: (collectionData: any) => void
}

interface CollectionData {
  name: string
  description: string
  treeAddress: string
  capacity: number
  minted: number
  creator?: string
  symbol?: string
  image?: string
}

export function ImportCollectionModal({ trigger, onImport }: ImportCollectionModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [treeAddress, setTreeAddress] = useState('')
  const [customName, setCustomName] = useState('')
  const [collectionData, setCollectionData] = useState<CollectionData | null>(null)
  const [validation, setValidation] = useState({
    treeAddressValid: false,
    isChecking: false
  })

  const validateTreeAddress = (address: string) => {
    if (!address) {
      setValidation(prev => ({ ...prev, treeAddressValid: false }))
      return false
    }

    // Solana address validation (exactly 44 chars, base58)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{44}$/
    const isValidFormat = base58Regex.test(address)
    
    setValidation(prev => ({ ...prev, treeAddressValid: isValidFormat }))
    return isValidFormat
  }

  const fetchCollectionData = async (address: string) => {
    if (!validateTreeAddress(address)) {
      toast({
        title: "Неверный адрес",
        description: "Введите корректный Solana tree address",
        variant: "destructive"
      })
      return
    }

    setFetching(true)
    try {
      console.log(`[fetchCollectionData] Получаем данные для tree: ${address}`)
      
      // Вызываем API для автоматического получения данных коллекции
      const response = await fetch('/api/nft-collection/fetch-tree-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ treeAddress: address })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Не удалось получить данные коллекции')
      }

      setCollectionData(result.collection)
      
      toast({
        title: "Данные получены! ✅",
        description: `Найдена коллекция "${result.collection.name}"`,
      })

    } catch (error) {
      console.error('Fetch failed:', error)
      toast({
        title: "Ошибка получения данных",
        description: error instanceof Error ? error.message : "Не удалось получить данные коллекции",
        variant: "destructive"
      })
      setCollectionData(null)
    } finally {
      setFetching(false)
    }
  }

  const handleImport = async () => {
    if (!validation.treeAddressValid || !collectionData) {
      toast({
        title: "Ошибка валидации",
        description: "Сначала получите данные коллекции",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Используем полученные данные для импорта
      const importData = {
        ...collectionData,
        name: customName.trim() || collectionData.name, // Пользователь может переопределить название
        treeAddress: treeAddress
      }

      const response = await fetch('/api/nft-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Не удалось импортировать коллекцию')
      }

      onImport?.(result.collection)
      
      toast({
        title: "Коллекция импортирована! 🎉",
        description: `${importData.name} готова для compressed NFT минтинга`,
      })

      // Сброс формы
      resetForm()
      setOpen(false)

    } catch (error) {
      console.error('Import failed:', error)
      toast({
        title: "Ошибка импорта",
        description: error instanceof Error ? error.message : "Не удалось импортировать коллекцию",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTreeAddress('')
    setCustomName('')
    setCollectionData(null)
    setValidation({
      treeAddressValid: false,
      isChecking: false
    })
  }

  const copyTreeAddress = () => {
    if (treeAddress) {
      navigator.clipboard.writeText(treeAddress)
      toast({
        title: "Скопировано!",
        description: "Tree address скопирован в буфер обмена",
      })
    }
  }

  const handleTreeAddressChange = (address: string) => {
    setTreeAddress(address)
    validateTreeAddress(address)
    setCollectionData(null) // Сбрасываем данные при изменении адреса
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-emerald-600 to-teal-600">
            <FolderPlus className="h-4 w-4 mr-2" />
            Импорт коллекции
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Автоимпорт Compressed NFT коллекции
          </DialogTitle>
          <DialogDescription>
            Введите tree address - система автоматически получит все данные коллекции
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tree Address */}
          <div>
            <Label htmlFor="tree-address">Tree Address *</Label>
            <div className="flex gap-2">
              <Input
                id="tree-address"
                placeholder="Введите Solana tree address (44 символа)"
                value={treeAddress}
                onChange={(e) => handleTreeAddressChange(e.target.value)}
                className="font-mono text-sm"
              />
              {treeAddress && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyTreeAddress}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            {validation.treeAddressValid && (
              <div className="flex items-center gap-2 mt-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Корректный адрес</span>
              </div>
            )}
          </div>

          {/* Fetch Button */}
          {validation.treeAddressValid && !collectionData && (
            <Button
              onClick={() => fetchCollectionData(treeAddress)}
              disabled={fetching}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {fetching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Получаем данные...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Получить данные коллекции
                </>
              )}
            </Button>
          )}

          {/* Collection Data Preview */}
          {collectionData && (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                <TreePine className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-emerald-900">Данные коллекции</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-700">Название:</span>
                  <span className="font-medium text-emerald-900">{collectionData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Capacity:</span>
                  <span className="font-medium text-emerald-900">{collectionData.capacity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Заминчено:</span>
                  <span className="font-medium text-emerald-900">{collectionData.minted.toLocaleString()}</span>
                </div>
                {collectionData.symbol && (
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Symbol:</span>
                    <span className="font-medium text-emerald-900">{collectionData.symbol}</span>
                  </div>
                )}
                {collectionData.description && (
                  <div className="mt-2">
                    <span className="text-emerald-700">Описание:</span>
                    <p className="text-emerald-900 text-xs mt-1">{collectionData.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Optional Custom Name */}
          {collectionData && (
            <div>
              <Label htmlFor="custom-name">Пользовательское название (опционально)</Label>
              <Input
                id="custom-name"
                placeholder={`По умолчанию: ${collectionData.name}`}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Оставьте пустым для использования оригинального названия
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!collectionData || loading}
            className="bg-gradient-to-r from-emerald-600 to-teal-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Импортируем...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Импортировать коллекцию
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 