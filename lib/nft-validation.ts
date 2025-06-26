/**
 * Утилиты для валидации NFT метаданных
 * Обеспечивают совместимость с Phantom Wallet и стандартами Solana
 */

export interface NFTMetadata {
  name: string
  symbol: string
  description: string
  seller_fee_basis_points: number
  image: string
  attributes: any[]
  properties: {
    files: Array<{uri: string, type: string}>
    category: string
    creators?: Array<{address: string, share: number, verified: boolean}>
  }
  external_url?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * ✅ ВАЛИДАЦИЯ JSON метаданных для Phantom Wallet совместимости
 * Проверяет критические поля которые влияют на отображение NFT
 */
export function validateNFTMetadata(metadata: NFTMetadata): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Обязательные поля верхнего уровня
  if (!metadata.name || metadata.name.trim() === '') {
    errors.push('❌ name не может быть пустым')
  }
  
  if (!metadata.symbol || metadata.symbol.trim() === '') {
    errors.push('❌ symbol не может быть пустым')
  }
  
  if (metadata.seller_fee_basis_points === undefined || metadata.seller_fee_basis_points === null) {
    errors.push('❌ seller_fee_basis_points обязательное поле для Phantom')
  }
  
  if (!metadata.image || metadata.image.trim() === '') {
    errors.push('❌ image URI не может быть пустым')
  } else if (!isValidIpfsUri(metadata.image)) {
    warnings.push('⚠️ image не является IPFS URI - может вызвать проблемы с загрузкой')
  }
  
  // Проверка properties
  if (!metadata.properties) {
    errors.push('❌ properties объект обязателен')
  } else {
    // Проверка files массива
    if (!metadata.properties.files || !Array.isArray(metadata.properties.files) || metadata.properties.files.length === 0) {
      errors.push('❌ properties.files должен содержать минимум один файл')
    } else {
      const firstFile = metadata.properties.files[0]
      if (!firstFile.uri || firstFile.uri.trim() === '') {
        errors.push('❌ КРИТИЧЕСКОЕ: properties.files[0].uri пустой - изображение НЕ будет отображаться!')
      }
      
      if (metadata.image !== firstFile.uri) {
        errors.push('❌ КРИТИЧЕСКОЕ: image и properties.files[0].uri должны быть одинаковыми')
      }
      
      if (!firstFile.type) {
        warnings.push('⚠️ properties.files[0].type не указан')
      }
    }
    
    if (!metadata.properties.category) {
      errors.push('❌ properties.category обязательное поле')
    }
    
    // Проверка creators (если есть)
    if (metadata.properties.creators) {
      if (Array.isArray(metadata.properties.creators)) {
        if (metadata.properties.creators.length === 0) {
          warnings.push('⚠️ Пустой creators массив может вызвать проблемы - лучше убрать')
        } else {
          // Проверяем структуру creators
          metadata.properties.creators.forEach((creator, index) => {
            if (!creator.address) {
              errors.push(`❌ creators[${index}].address обязательное поле`)
            }
            if (creator.share === undefined || creator.share < 0 || creator.share > 100) {
              errors.push(`❌ creators[${index}].share должен быть от 0 до 100`)
            }
          })
          
          // Проверяем что сумма shares = 100
          const totalShare = metadata.properties.creators.reduce((sum, creator) => sum + (creator.share || 0), 0)
          if (totalShare !== 100) {
            warnings.push(`⚠️ Сумма creators shares = ${totalShare}, рекомендуется 100`)
          }
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Проверяет является ли URI валидным IPFS адресом
 */
export function isValidIpfsUri(uri: string): boolean {
  return uri.startsWith('ipfs://') || 
         uri.includes('/ipfs/') || 
         uri.includes('pinata.cloud') ||
         uri.includes('gateway.pinata.cloud') ||
         uri.startsWith('https://') ||  // ✅ Принимаем HTTPS gateway URLs
         uri.includes('amber-accused-tortoise-973.mypinata.cloud')  // ✅ Специфический gateway
}

/**
 * Создает корректную структуру NFT метаданных
 */
export function createValidNFTMetadata(params: {
  name: string
  symbol: string
  description: string
  imageUri: string
  imageType?: string
  attributes?: any[]
  externalUrl?: string
}): NFTMetadata {
  const { name, symbol, description, imageUri, imageType = 'image/png', attributes = [], externalUrl } = params
  
  const metadata: NFTMetadata = {
    name,
    symbol,
    description,
    seller_fee_basis_points: 0,  // Обязательное для Phantom
    image: imageUri,
    attributes,
    properties: {
      files: [{
        uri: imageUri,  // КРИТИЧЕСКОЕ: тот же URI что и в image
        type: imageType
      }],
      category: 'image'
    }
  }
  
  if (externalUrl) {
    metadata.external_url = externalUrl
  }
  
  return metadata
}

/**
 * Логирует результаты валидации в консоль
 */
export function logValidationResults(validation: ValidationResult, metadataName?: string): void {
  const prefix = metadataName ? `[${metadataName}]` : '[NFT Metadata]'
  
  if (validation.isValid) {
    console.log(`${prefix} ✅ Метаданные валидны`)
  } else {
    console.error(`${prefix} ❌ Найдены ошибки:`)
    validation.errors.forEach(error => console.error(`  ${error}`))
  }
  
  if (validation.warnings.length > 0) {
    console.warn(`${prefix} ⚠️ Предупреждения:`)
    validation.warnings.forEach(warning => console.warn(`  ${warning}`))
  }
} 