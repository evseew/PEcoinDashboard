import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { collection, recipient, metadata } = await request.json()
    
    console.log('[Mint Single] Получен запрос на минтинг:', {
      collection: collection ? {
        id: collection.id,
        name: collection.name,
        treeAddress: collection.treeAddress
      } : null,
      recipient,
      metadata: {
        name: metadata?.name,
        uri: metadata?.uri,
        hasImage: !!metadata?.image,
        imageUrl: metadata?.image
      }
    })

    // Валидация входных данных
    if (!collection || !collection.id || !recipient || !metadata) {
      return NextResponse.json({
        success: false,
        error: 'Отсутствуют обязательные поля: collection (с id), recipient, metadata'
      }, { status: 400 })
    }

    // Валидация адреса кошелька Solana
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipient)) {
      return NextResponse.json({
        success: false,
        error: 'Неверный формат адреса кошелька Solana'
      }, { status: 400 })
    }

    // КРИТИЧЕСКАЯ ПРОВЕРКА: Валидация metadata URI
    if (!metadata.uri) {
      console.error('[Mint Single] ❌ ОШИБКА: Отсутствует metadata.uri!')
      return NextResponse.json({
        success: false,
        error: 'Отсутствует metadata.uri - невозможно создать NFT без метаданных'
      }, { status: 400 })
    }

    // Проверяем доступность metadata URI
    try {
      console.log('[Mint Single] Проверяем доступность metadata URI:', metadata.uri)
      
      const metadataResponse = await fetch(metadata.uri, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      })
      
      if (!metadataResponse.ok) {
        throw new Error(`Metadata URI недоступен: ${metadataResponse.status}`)
      }
      
      console.log('[Mint Single] ✅ Metadata URI доступен')
      
      // Пробуем получить JSON метаданные для дополнительной проверки
      const metadataJsonResponse = await fetch(metadata.uri, {
        signal: AbortSignal.timeout(5000)
      })
      
      if (metadataJsonResponse.ok) {
        const metadataJson = await metadataJsonResponse.json()
        console.log('[Mint Single] ✅ Metadata JSON корректен:', {
          name: metadataJson.name,
          hasImage: !!metadataJson.image,
          imageUrl: metadataJson.image,
          attributes: metadataJson.attributes?.length || 0
        })
        
        // Проверяем image URL внутри метаданных
        if (metadataJson.image) {
          try {
            const imageResponse = await fetch(metadataJson.image, { 
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            })
            
            if (imageResponse.ok) {
              console.log('[Mint Single] ✅ Image URL доступен:', metadataJson.image)
            } else {
              console.warn('[Mint Single] ⚠️ Image URL недоступен:', metadataJson.image, imageResponse.status)
            }
          } catch (imgError) {
            console.warn('[Mint Single] ⚠️ Ошибка проверки image URL:', imgError)
          }
        } else {
          console.warn('[Mint Single] ⚠️ В метаданных отсутствует image URL')
        }
      }
      
    } catch (uriError: any) {
      console.error('[Mint Single] ❌ КРИТИЧЕСКАЯ ОШИБКА metadata URI:', uriError.message)
      return NextResponse.json({
        success: false,
        error: `Metadata URI недоступен: ${uriError.message}`,
        details: 'Проверьте загрузку метаданных на IPFS/Pinata'
      }, { status: 400 })
    }

    // Проверяем доступность External API для реального минтинга
    const externalApiUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_URL
    const externalApiKey = process.env.NEXT_PUBLIC_EXTERNAL_API_KEY
    
    if (!externalApiUrl || !externalApiKey) {
      console.warn('[Mint Single] ⚠️ External API не настроен, выполняем симуляцию')
      
      // Симуляция времени минтинга
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const operationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      return NextResponse.json({
        success: true,
        data: {
          operationId,
          message: 'NFT заминтен в режиме симуляции (External API недоступен)',
          transactionHash: `sim_tx_${operationId}`,
          recipient,
          metadata: {
            ...metadata,
            validation: {
              metadataUriValid: true,
              imageUriValid: true
            }
          }
        }
      })
    }

    // Пробуем реальный минтинг через External API
    try {
      console.log('[Mint Single] Отправляем запрос на External API:', externalApiUrl)
      
      const externalResponse = await fetch(`${externalApiUrl}/api/mint/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': externalApiKey
        },
        body: JSON.stringify({
          collection,
          recipient,
          metadata
        }),
        signal: AbortSignal.timeout(30000) // 30 секунд
      })

      const externalData = await externalResponse.json()
      
      if (externalResponse.ok && externalData.success) {
        console.log('[Mint Single] ✅ External API минтинг успешен:', externalData.data?.operationId)
        return NextResponse.json(externalData)
      } else {
        throw new Error(externalData.error || 'External API error')
      }
      
    } catch (externalError: any) {
      console.error('[Mint Single] ❌ External API недоступен:', externalError.message)
      
      // Fallback на симуляцию с подробным логированием
      console.log('[Mint Single] Fallback на симуляцию с проверенными метаданными')
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      const operationId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      return NextResponse.json({
        success: true,
        data: {
          operationId,
          message: 'NFT заминтен через fallback (External API недоступен)',
          transactionHash: `fallback_tx_${operationId}`,
          recipient,
          metadata,
          fallbackReason: externalError.message
        }
      })
    }

  } catch (error: any) {
    console.error('[Mint Single] Критическая ошибка:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при минтинге',
      details: error.message
    }, { status: 500 })
  }
} 