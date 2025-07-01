type ApiSource = 'internal' | 'external' | 'auto'

interface ApiConfig {
  source: ApiSource
  fallback?: boolean
  retries?: number
}

// Определяем какие операции через какой API делать
const API_ROUTING = {
  // Быстрые операции - через внутренние API
  getCollections: { source: 'internal' as ApiSource, fallback: true },
  getWalletNFTs: { source: 'internal' as ApiSource },
  
  // Реальный минтинг через external API с fallback на internal
  mintSingle: { source: 'external' as ApiSource, fallback: true },
  mintBatch: { source: 'external' as ApiSource },
  
  // Upload операции через internal API (которые проксируют к external)
  uploadImage: { source: 'internal' as ApiSource, fallback: false },
  uploadMetadata: { source: 'internal' as ApiSource, fallback: false },
  processImages: { source: 'external' as ApiSource }
}

class HybridApiClient {
  private internalBaseUrl = '/api'
  private externalBaseUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_URL || ''
  private externalApiKey = process.env.NEXT_PUBLIC_EXTERNAL_API_KEY || ''

  async request(endpoint: string, options: RequestInit = {}, config: ApiConfig = { source: 'internal' }): Promise<any> {
    const { source, fallback, retries = 1 } = config
    
    if (source === 'auto') {
      return this.autoRoute(endpoint, options)
    }

    try {
      if (source === 'external') {
        return await this.externalRequest(endpoint, options)
      } else {
        return await this.internalRequest(endpoint, options)
      }
    } catch (error) {
      if (fallback && retries > 0) {
        console.warn(`[API] Fallback from ${source} to ${source === 'external' ? 'internal' : 'external'}`)
        const fallbackSource = source === 'external' ? 'internal' : 'external'
        return this.request(endpoint, options, { source: fallbackSource, retries: retries - 1 })
      }
      throw error
    }
  }

  private async internalRequest(endpoint: string, options: RequestInit): Promise<any> {
    // Подготавливаем заголовки - для FormData не устанавливаем Content-Type
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>
    }
    
    // Добавляем Content-Type только если это не FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    
    const response = await fetch(`${this.internalBaseUrl}${endpoint}`, {
      ...options,
      headers
    })
    
    // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: Проверяем успешность запроса
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Internal API error: ${response.status} ${response.statusText}. ${errorText}`)
    }
    
    return response.json()
  }

  private async externalRequest(endpoint: string, options: RequestInit): Promise<any> {
    if (!this.externalBaseUrl) {
      throw new Error('External API URL not configured')
    }
    
    // Подготавливаем заголовки - для FormData не устанавливаем Content-Type
    const headers: Record<string, string> = {
      'x-api-key': this.externalApiKey,
      ...options.headers as Record<string, string>
    }
    
    // Добавляем Content-Type только если это не FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    
    const response = await fetch(`${this.externalBaseUrl}${endpoint}`, {
      ...options,
      headers
    })
    
    // ✅ ДОБАВЛЯЕМ ПРОВЕРКУ И ДЛЯ EXTERNAL API
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`External API error: ${response.status} ${response.statusText}. ${errorText}`)
    }
    
    return response.json()
  }

  private async autoRoute(endpoint: string, options: RequestInit): Promise<any> {
    // Логика автоматического выбора API на основе нагрузки/доступности
    const healthCheck = await this.checkExternalHealth()
    const source = healthCheck ? 'external' : 'internal'
    return this.request(endpoint, options, { source })
  }

  private async checkExternalHealth(): Promise<boolean> {
    // ✅ ИСПРАВЛЕНИЕ: Если external URL не настроен, сразу возвращаем false
    if (!this.externalBaseUrl || this.externalBaseUrl.trim() === '') {
      return false
    }
    
    try {
      const response = await fetch(`${this.externalBaseUrl}/health`, { 
        signal: AbortSignal.timeout(3000) 
      })
      return response.ok
    } catch {
      return false
    }
  }

  // API методы с автоматическим роутингом
  async getCollections() {
    return this.request('/nft-collection', { method: 'GET' }, API_ROUTING.getCollections)
  }

  async mintSingle(data: any) {
    return this.request('/mint/single', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }, API_ROUTING.mintSingle)
  }

  async getWalletNFTs(walletAddress: string) {
    return this.request('/nft-collection', {
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    }, API_ROUTING.getWalletNFTs)
  }

  async uploadImage(imageFile: File, customName?: string) {
    const formData = new FormData()
    formData.append('image', imageFile)
    if (customName) {
      formData.append('name', customName)
    }

    return this.request('/upload/image', {
      method: 'POST',
      body: formData
      // Для FormData не устанавливаем заголовки - браузер сделает это автоматически
    }, API_ROUTING.uploadImage)
  }

  async uploadMetadata(metadata: any, filename?: string) {
    return this.request('/upload/metadata', {
      method: 'POST',
      body: JSON.stringify({ metadata, filename })
    }, API_ROUTING.uploadMetadata)
  }
}

export const apiClient = new HybridApiClient()
export { API_ROUTING } 