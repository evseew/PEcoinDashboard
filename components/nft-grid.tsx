"use client"

import { motion } from "framer-motion"
import { useEffect } from "react"
import { getProxiedImageUrl, preloadImages } from "@/lib/image-proxy"

interface NftGridProps {
  nfts: any[]
}

export function NftGrid({ nfts }: NftGridProps) {
  // Предзагружаем изображения для улучшения UX
  useEffect(() => {
    if (nfts && nfts.length > 0) {
      const imageUrls = nfts
        .map(nft => nft.image)
        .filter(Boolean)
        .slice(0, 10) // Предзагружаем только первые 10 изображений
      
      if (imageUrls.length > 0) {
        preloadImages(imageUrls)
      }
    }
  }, [nfts])

  if (!nfts || nfts.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        <div className="mb-2">🖼️</div>
        <div>Коллекция NFT пуста</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {nfts.map((nft, index) => (
        <motion.div
          key={nft.id || nft.mintAddress || index}
          className="flex flex-col items-center group cursor-pointer"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.08, y: -5 }}
        >
          <div className="aspect-square w-full relative overflow-hidden rounded-lg mb-3 shadow-lg bg-gray-100 dark:bg-gray-800">
            {/* Индикатор compressed NFT */}
            {nft.isCompressed && (
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  cNFT
                </div>
              </div>
            )}
            
            {nft.image && nft.image !== 'Нет изображения' ? (
              <img
                src={getProxiedImageUrl(nft.image)}
                alt={nft.name || 'NFT'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy" // Ленивая загрузка для экономии ресурсов
                onError={(e) => {
                  // Если изображение не загрузилось, показываем плейсхолдер
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent && !parent.querySelector('.nft-placeholder')) {
                    const placeholder = document.createElement('div')
                    placeholder.className = 'nft-placeholder w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800'
                    placeholder.textContent = nft.isCompressed ? '🗜️' : '🖼️'
                    parent.appendChild(placeholder)
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                {nft.isCompressed ? '🗜️' : '🖼️'}
              </div>
            )}
            
            {/* Оверлей с дополнительной информацией */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
              <div className="text-white text-xs space-y-1">
                {nft.isCompressed && (
                  <div className="truncate">💾 Compressed NFT</div>
                )}
                {nft.collection && nft.collection !== 'Неизвестная коллекция' && nft.collection !== 'Compressed Collection' && (
                  <div className="truncate">📁 {nft.collection}</div>
                )}
                {nft.symbol && (
                  <div className="truncate">🏷️ {nft.symbol}</div>
                )}
                {nft.attributes && nft.attributes.length > 0 && (
                  <div className="truncate">✨ {nft.attributes.length} атрибут{nft.attributes.length > 1 ? 'ов' : ''}</div>
                )}
                {nft.isCompressed && nft.treeId && (
                  <div className="truncate text-purple-300">🌳 Tree: {nft.treeId.substring(0, 8)}...</div>
                )}
              </div>
            </div>
          </div>
          
          <div className="w-full text-center px-2">
            <h3 className="font-display font-bold text-sm md:text-base mb-1 truncate" title={nft.name}>
              {nft.name || 'Без названия'}
            </h3>
            {nft.description && nft.description !== 'Без описания' && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2" title={nft.description}>
                {nft.description}
              </p>
            )}
            {/* Показываем тип NFT в подписи */}
            {nft.isCompressed && (
              <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                Compressed NFT
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
