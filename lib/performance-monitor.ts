// Мониторинг производительности для критических операций
// Помогает отслеживать узкие места и оптимизировать UX

interface PerformanceMetric {
  operation: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>()
  private completedMetrics: PerformanceMetric[] = []
  private maxHistory = 100 // Сохраняем последние 100 операций

  /**
   * ✅ Начать отслеживание операции
   */
  start(operationId: string, operation: string, metadata?: Record<string, any>): void {
    this.metrics.set(operationId, {
      operation,
      startTime: Date.now(),
      metadata
    })
    
    console.log(`[PerfMonitor] 🚀 Начало: ${operation} (${operationId})`)
  }

  /**
   * ✅ Завершить отслеживание операции
   */
  end(operationId: string, additionalMetadata?: Record<string, any>): number | null {
    const metric = this.metrics.get(operationId)
    if (!metric) {
      console.warn(`[PerfMonitor] ⚠️ Метрика ${operationId} не найдена`)
      return null
    }

    const endTime = Date.now()
    const duration = endTime - metric.startTime
    
    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...additionalMetadata }
    }

    // Сохраняем в историю
    this.completedMetrics.unshift(completedMetric)
    if (this.completedMetrics.length > this.maxHistory) {
      this.completedMetrics.pop()
    }

    // Удаляем из активных
    this.metrics.delete(operationId)

    // Логируем результат с эмодзи в зависимости от производительности
    const emoji = duration < 1000 ? '🚀' : duration < 3000 ? '⚡' : duration < 5000 ? '🐌' : '🔥'
    console.log(`[PerfMonitor] ${emoji} Завершено: ${metric.operation} за ${duration}ms (${operationId})`)

    return duration
  }

  /**
   * ✅ Обёртка для асинхронных операций
   */
  async measure<T>(
    operationId: string, 
    operation: string, 
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(operationId, operation, metadata)
    
    try {
      const result = await fn()
      this.end(operationId, { success: true })
      return result
    } catch (error) {
      this.end(operationId, { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      })
      throw error
    }
  }

  /**
   * ✅ Получить статистику производительности
   */
  getStats() {
    const recentMetrics = this.completedMetrics.slice(0, 20) // Последние 20
    
    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        recentOperations: []
      }
    }

    const durations = recentMetrics.map(m => m.duration!).filter(d => d !== undefined)
    
    return {
      totalOperations: this.completedMetrics.length,
      avgDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      recentOperations: recentMetrics.map(m => ({
        operation: m.operation,
        duration: m.duration,
        timestamp: m.endTime,
        metadata: m.metadata
      }))
    }
  }

  /**
   * ✅ Получить медленные операции
   */
  getSlowOperations(thresholdMs = 3000) {
    return this.completedMetrics
      .filter(m => m.duration && m.duration > thresholdMs)
      .slice(0, 10)
      .map(m => ({
        operation: m.operation,
        duration: m.duration,
        timestamp: m.endTime,
        metadata: m.metadata
      }))
  }

  /**
   * ✅ Очистить историю
   */
  clear(): void {
    this.completedMetrics = []
    this.metrics.clear()
    console.log('[PerfMonitor] 🗑️ История очищена')
  }
}

// Глобальный экземпляр монитора
export const perfMonitor = new PerformanceMonitor()

// Удобные функции для основных операций
export const measureBalanceLoad = (walletCount: number) => 
  perfMonitor.start(`balance-${Date.now()}`, `Загрузка балансов`, { walletCount })

export const measureSupabaseQuery = (table: string) => 
  perfMonitor.start(`supabase-${Date.now()}`, `Supabase запрос: ${table}`)

export const measureATAComputation = (walletCount: number) => 
  perfMonitor.start(`ata-${Date.now()}`, `Вычисление ATA`, { walletCount }) 