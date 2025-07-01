import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api-strategy'
import { NFTCollection } from './use-nft-collections'

interface MintingResult {
  success: boolean
  operationId?: string
  transaction?: string
  error?: string
}

interface MintingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  transaction?: string
  error?: string
}

export function useHybridNft() {
  const [mintingOperations, setMintingOperations] = useState<Map<string, MintingStatus>>(new Map())
  
  // Минтинг через гибридный API
  const mintSingle = useCallback(async (mintData: {
    collection: {
      id: string
      name: string
      symbol: string
      treeAddress: string
      collectionAddress: string
      creatorAddress?: string
      sellerFeeBasisPoints?: number
    }
    recipient: string
    metadata: {
      name: string
      uri: string
      symbol: string
      description: string
      creators?: Array<{
        address: string
        share: number
        verified: boolean
      }>
    }
  }): Promise<MintingResult> => {
    try {
      console.log('[useHybridNft] Запуск минтинга:', mintData)
      
      const response = await apiClient.mintSingle(mintData)
      
      if (response.success && response.data?.operationId) {
        // Начинаем отслеживание статуса
        startStatusPolling(response.data.operationId)
        
        return {
          success: true,
          operationId: response.data.operationId
        }
      } else {
        return {
          success: false,
          error: response.error || 'Ошибка минтинга'
        }
      }
    } catch (error: any) {
      console.error('[useHybridNft] Ошибка минтинга:', error)
      return {
        success: false,
        error: error.message || 'Не удалось выполнить минтинг'
      }
    }
  }, [])

  // Отслеживание статуса операции
  const startStatusPolling = useCallback((operationId: string) => {
    console.log('[useHybridNft] Начинаем отслеживание операции:', operationId)
    
    setMintingOperations(prev => new Map(prev).set(operationId, {
      status: 'pending',
      progress: 0
    }))

    const pollStatus = async (attempts = 0) => {
      try {
        const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/api/mint/status/${operationId}`, {
          headers: {
            'X-API-Key': process.env.NEXT_PUBLIC_EXTERNAL_API_KEY || ''
          }
        })
        
        const statusData = await statusResponse.json()
        
        if (statusData.success) {
          const status = statusData.data
          
          setMintingOperations(prev => new Map(prev).set(operationId, {
            status: status.status,
            progress: status.progress || 0,
            transaction: status.transaction,
            error: status.error
          }))
          
          // Продолжаем polling если операция не завершена
          if (status.status === 'pending' || status.status === 'processing') {
            if (attempts < 30) { // Максимум 30 попыток (1 минута)
              setTimeout(() => pollStatus(attempts + 1), 2000)
            } else {
              // Таймаут
              setMintingOperations(prev => new Map(prev).set(operationId, {
                status: 'failed',
                error: 'Timeout: операция не завершилась в разумное время'
              }))
            }
          }
        }
      } catch (error) {
        console.error('[useHybridNft] Ошибка получения статуса:', error)
        setMintingOperations(prev => new Map(prev).set(operationId, {
          status: 'failed',
          error: 'Ошибка отслеживания статуса'
        }))
      }
    }

    pollStatus()
  }, [])

  // Получение статуса операции
  const getOperationStatus = useCallback((operationId: string): MintingStatus | undefined => {
    return mintingOperations.get(operationId)
  }, [mintingOperations])

  // Очистка завершенных операций
  const clearOperation = useCallback((operationId: string) => {
    setMintingOperations(prev => {
      const newMap = new Map(prev)
      newMap.delete(operationId)
      return newMap
    })
  }, [])

  // Получение NFT для кошелька (используем гибридный роутинг)
  const getWalletNFTs = useCallback(async (walletAddress: string) => {
    try {
      const response = await apiClient.getWalletNFTs(walletAddress)
      return response
    } catch (error: any) {
      console.error('[useHybridNft] Ошибка получения NFT:', error)
      throw error
    }
  }, [])

  return {
    // Минтинг
    mintSingle,
    
    // Статус операций
    mintingOperations: Array.from(mintingOperations.entries()).map(([id, status]) => ({
      operationId: id,
      ...status
    })),
    getOperationStatus,
    clearOperation,
    
    // NFT операции
    getWalletNFTs
  }
} 