interface ApiMetrics {
  endpoint: string
  source: 'internal' | 'external'
  responseTime: number
  success: boolean
  timestamp: Date
  error?: string
}

class IntegrationMonitor {
  private metrics: ApiMetrics[] = []
  private readonly maxMetrics = 1000 // Храним последние 1000 запросов

  // Логирование API запроса
  logApiCall(endpoint: string, source: 'internal' | 'external', responseTime: number, success: boolean, error?: string) {
    const metric: ApiMetrics = {
      endpoint,
      source,
      responseTime,
      success,
      timestamp: new Date(),
      error
    }

    this.metrics.push(metric)
    
    // Ограничиваем размер массива
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Логируем в консоль для разработки
    console.log(`[Monitor] ${source.toUpperCase()} ${endpoint}: ${responseTime}ms ${success ? '✅' : '❌'}`)
    
    // Отправляем критические ошибки в аналитику
    if (!success && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'api_error', {
        event_category: 'integration',
        event_label: `${source}_${endpoint}`,
        value: responseTime
      })
    }
  }

  // Получение статистики за период
  getStats(minutes = 60) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff)

    const internal = recentMetrics.filter(m => m.source === 'internal')
    const external = recentMetrics.filter(m => m.source === 'external')

    return {
      period: `${minutes} minutes`,
      total: recentMetrics.length,
      internal: {
        count: internal.length,
        successRate: internal.length > 0 ? (internal.filter(m => m.success).length / internal.length) * 100 : 0,
        avgResponseTime: internal.length > 0 ? internal.reduce((sum, m) => sum + m.responseTime, 0) / internal.length : 0
      },
      external: {
        count: external.length,
        successRate: external.length > 0 ? (external.filter(m => m.success).length / external.length) * 100 : 0,
        avgResponseTime: external.length > 0 ? external.reduce((sum, m) => sum + m.responseTime, 0) / external.length : 0
      },
      errors: recentMetrics.filter(m => !m.success).map(m => ({
        endpoint: m.endpoint,
        source: m.source,
        error: m.error,
        timestamp: m.timestamp
      }))
    }
  }

  // Проверка здоровья API
  async healthCheck(): Promise<{ internal: boolean; external: boolean }> {
    const results = await Promise.allSettled([
      // Internal API
      fetch('/api/nft-collection').then(r => r.ok),
      // External API
      fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/health`).then(r => r.ok)
    ])

    return {
      internal: results[0].status === 'fulfilled' ? results[0].value : false,
      external: results[1].status === 'fulfilled' ? results[1].value : false
    }
  }

  // Рекомендации по оптимизации
  getRecommendations() {
    const stats = this.getStats(60)
    const recommendations: string[] = []

    // Анализ производительности
    if (stats.external.avgResponseTime > stats.internal.avgResponseTime * 2) {
      recommendations.push('External API медленнее internal в 2+ раза. Рассмотрите увеличение таймаутов.')
    }

    // Анализ доступности
    if (stats.external.successRate < 95) {
      recommendations.push('External API имеет низкую доступность. Активируйте fallback на internal API.')
    }

    if (stats.internal.successRate < 98) {
      recommendations.push('Internal API работает нестабильно. Проверьте конфигурацию Supabase.')
    }

    // Анализ нагрузки
    if (stats.external.count > stats.internal.count * 3) {
      recommendations.push('Слишком много запросов к external API. Переведите часть на internal.')
    }

    return recommendations
  }

  // Экспорт метрик для анализа
  exportMetrics() {
    return {
      metrics: this.metrics,
      stats: this.getStats(),
      recommendations: this.getRecommendations(),
      timestamp: new Date().toISOString()
    }
  }
}

export const integrationMonitor = new IntegrationMonitor()

// Хелпер для обертки API вызовов с мониторингом
export async function monitorApiCall<T>(
  endpoint: string,
  source: 'internal' | 'external',
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await apiCall()
    const responseTime = Date.now() - startTime
    integrationMonitor.logApiCall(endpoint, source, responseTime, true)
    return result
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    integrationMonitor.logApiCall(endpoint, source, responseTime, false, error.message)
    throw error
  }
} 