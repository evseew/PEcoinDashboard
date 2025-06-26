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
  uploadMetadata: { source: 'internal' as ApiSource },
  
  // Реальный минтинг через external API с fallback на internal
  mintSingle: { source: 'external' as ApiSource, fallback: true },
  mintBatch: { source: 'external' as ApiSource },
  processImages: { source: 'external' as ApiSource },
  
  // Автоматический выбор по нагрузке
  getWalletNFTs: { source: 'auto' as ApiSource }
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
    const response = await fetch(`${this.internalBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    return response.json()
  }

  private async externalRequest(endpoint: string, options: RequestInit): Promise<any> {
    if (!this.externalBaseUrl) {
      throw new Error('External API URL not configured')
    }
    
    const response = await fetch(`${this.externalBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.externalApiKey,
        ...options.headers
      }
    })
    return response.json()
  }

  private async autoRoute(endpoint: string, options: RequestInit): Promise<any> {
    // Логика автоматического выбора API на основе нагрузки/доступности
    const healthCheck = await this.checkExternalHealth()
    const source = healthCheck ? 'external' : 'internal'
    return this.request(endpoint, options, { source })
  }

  private async checkExternalHealth(): Promise<boolean> {
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
    return this.request('/api/mint/single', { 
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
    }, { source: 'external', fallback: false }) // Загрузка только через external API
  }

  async uploadMetadata(metadata: any, filename?: string) {
    return this.request('/upload/metadata', {
      method: 'POST',
      body: JSON.stringify({ metadata, filename })
    }, { source: 'external', fallback: false }) // Метаданные только через external API
  }
}

export const apiClient = new HybridApiClient()
export { API_ROUTING } 