'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CollectionsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Перенаправляем на страницу управления коллекциями
    router.replace('/admin/nft-minting/settings')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg text-gray-600">Redirecting to Collection Management...</p>
      </div>
    </div>
  )
}