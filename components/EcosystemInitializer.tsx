'use client'

import { useEffect, useState } from 'react'

export default function EcosystemInitializer() {
  const [initStatus, setInitStatus] = useState<'idle' | 'initializing' | 'initialized' | 'error'>('idle')

  useEffect(() => {
    const initializeEcosystem = async () => {
      if (initStatus !== 'idle') return
      
      setInitStatus('initializing')
      console.log('🌐 Запуск автоматической инициализации динамической экосистемы...')
      
      try {
        const response = await fetch('/api/ecosystem-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.alreadyInitialized) {
            console.log('✅ Динамическая экосистема уже инициализирована')
            console.log(`📊 Участников: ${data.stats.totalParticipants}`)
            setInitStatus('initialized')
          } else if (data.initializing) {
            console.log('⏳ Инициализация запущена, отслеживание статуса...')
            // Отслеживаем статус инициализации
            await trackInitializationStatus()
          }
        } else {
          console.error('❌ Ошибка инициализации экосистемы')
          setInitStatus('error')
        }
      } catch (error) {
        console.error('❌ Ошибка запроса инициализации:', error)
        setInitStatus('error')
      }
    }
    
    // Запускаем инициализацию через 1 секунду после загрузки страницы
    const timer = setTimeout(initializeEcosystem, 1000)
    
    return () => clearTimeout(timer)
  }, [initStatus])

  const trackInitializationStatus = async () => {
    let attempts = 0
    const maxAttempts = 30 // 60 секунд максимум
    
    const checkStatus = async (): Promise<void> => {
      try {
        const response = await fetch('/api/ecosystem-init')
        if (response.ok) {
          const data = await response.json()
          
          if (data.status.initialized) {
            console.log('✅ Динамическая экосистема успешно инициализирована!')
            if (data.stats) {
              console.log(`📊 Участников: ${data.stats.totalParticipants} (${data.stats.teams} команд, ${data.stats.startups} стартапов)`)
              console.log(`💰 Общий баланс: ${data.stats.totalBalance} PEcoin`)
            }
            setInitStatus('initialized')
            return
          }
          
          if (attempts < maxAttempts) {
            attempts++
            console.log(`⏳ Инициализация в процессе... (${attempts}/${maxAttempts})`)
            setTimeout(checkStatus, 2000) // Проверяем каждые 2 секунды
          } else {
            console.error('❌ Превышено время ожидания инициализации')
            setInitStatus('error')
          }
        }
      } catch (error) {
        console.error('⚠️ Ошибка проверки статуса инициализации:', error)
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(checkStatus, 2000)
        } else {
          setInitStatus('error')
        }
      }
    }
    
    checkStatus()
  }

  // Компонент не рендерит ничего видимого, только логи в консоль
  return null
} 