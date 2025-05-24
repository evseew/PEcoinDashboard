// Утилиты для проксирования изображений NFT через кэшированный API
// Избегает повторной загрузки изображений браузером

/**
 * Преобразует внешний URL изображения в проксированный через наш сервер
 */
export function getProxiedImageUrl(originalUrl: string): string {
  if (!originalUrl) return '/images/nft-placeholder.png'
  
  // Проверяем, что URL валидный
  try {
    new URL(originalUrl)
  } catch {
    return '/images/nft-placeholder.png'
  }
  
  // Если это уже локальный URL, возвращаем как есть
  if (originalUrl.startsWith('/') || originalUrl.includes(window?.location?.hostname)) {
    return originalUrl
  }
  
  // Кодируем URL для безопасной передачи как параметр
  const encodedUrl = encodeURIComponent(originalUrl)
  return `/api/nft-image?url=${encodedUrl}`
}

/**
 * Предзагрузка изображений для улучшения UX
 */
export function preloadImages(imageUrls: string[]): void {
  imageUrls.forEach(url => {
    if (url && url !== '/images/nft-placeholder.png') {
      const img = new Image()
      img.src = getProxiedImageUrl(url)
      // Изображение загрузится в фоне и попадет в кэш браузера
    }
  })
}

/**
 * Создает оптимизированный URL изображения с параметрами качества
 */
export function getOptimizedImageUrl(originalUrl: string, options?: {
  width?: number
  height?: number
  quality?: number
}): string {
  const proxiedUrl = getProxiedImageUrl(originalUrl)
  
  if (!options || proxiedUrl === '/images/nft-placeholder.png') {
    return proxiedUrl
  }
  
  const params = new URLSearchParams()
  if (options.width) params.set('w', options.width.toString())
  if (options.height) params.set('h', options.height.toString())
  if (options.quality) params.set('q', options.quality.toString())
  
  const paramString = params.toString()
  return paramString ? `${proxiedUrl}&${paramString}` : proxiedUrl
}

/**
 * Проверяет, является ли URL изображением
 */
export function isImageUrl(url: string): boolean {
  if (!url) return false
  
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.toLowerCase()
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(pathname)
  } catch {
    return false
  }
}

/**
 * Получить fallback изображение для NFT
 */
export function getNFTFallbackImage(nftName?: string): string {
  // Можно генерировать разные placeholder'ы на основе названия NFT
  return '/images/nft-placeholder.png'
} 