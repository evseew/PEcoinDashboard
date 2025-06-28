"use client"

import { useSearchParams } from 'next/navigation'
import { EntityDetailOptimized } from '@/components/entity-detail-optimized'
import { useEffect, useState } from 'react'

interface EntityPageProps {
  params: {
    entityType: string
    entityId: string
  }
}

export default function EntityPage({ params }: EntityPageProps) {
  const searchParams = useSearchParams()
  const [preloadedData, setPreloadedData] = useState<{
    nftCount: number
    nfts: any[]
  }>({
    nftCount: 0,
    nfts: []
  })

  // ✅ ЗАГРУЖАЕМ предзагруженные данные из query параметров и sessionStorage
  useEffect(() => {
    // Получаем количество NFT из query параметров
    const nftCountParam = searchParams.get('nftCount')
    const nftCount = nftCountParam ? parseInt(nftCountParam, 10) : 0

    // Получаем полные NFT данные из sessionStorage (если есть)
    const sessionKey = `nft-data-${params.entityId}` // Используем entityId как ключ
    let preloadedNFTs: any[] = []

    try {
      const sessionData = sessionStorage.getItem(sessionKey)
      if (sessionData) {
        preloadedNFTs = JSON.parse(sessionData)
        // Очищаем после использования
        sessionStorage.removeItem(sessionKey)
        console.log(`[EntityPage] ✅ Загружены предзагруженные NFT данные: ${preloadedNFTs.length} NFT`)
      }
    } catch (error) {
      console.warn('[EntityPage] ❌ Ошибка загрузки NFT данных из sessionStorage:', error)
    }

    setPreloadedData({
      nftCount,
      nfts: preloadedNFTs
    })
  }, [searchParams, params.entityId])

  return (
    <EntityDetailOptimized
      entityType={params.entityType}
      entityId={params.entityId}
      preloadedNFTCount={preloadedData.nftCount}
      preloadedNFTs={preloadedData.nfts}
    />
  )
}
