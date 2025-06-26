#!/bin/bash

# Скрипт для проверки и настройки CORS заголовков для Phantom Wallet
echo "🔧 Проверка CORS настроек для Phantom Wallet"
echo "============================================="

PINATA_GATEWAY="https://amber-accused-tortoise-973.mypinata.cloud"

echo "📍 Проверяем CORS заголовки Pinata Gateway..."

# Тестируем CORS заголовки
curl -H "Origin: https://phantom.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     "$PINATA_GATEWAY/ipfs/QmTest" \
     -i

echo ""
echo "🔍 Проверяем конкретное изображение NFT:"

# Получаем последний загруженный CID из Pinata
if [ -n "$PINATA_API_KEY" ]; then
    echo "📋 Получение последних файлов из Pinata..."
    
    LATEST_IMAGE=$(curl -s -X GET \
      "https://api.pinata.cloud/data/pinList?status=pinned&metadata[name]=nft-image&pageLimit=1" \
      -H "Authorization: Bearer $PINATA_API_KEY" | \
      jq -r '.rows[0].ipfs_pin_hash // empty')
    
    if [ -n "$LATEST_IMAGE" ] && [ "$LATEST_IMAGE" != "null" ]; then
        echo "🖼️ Тестируем изображение: $PINATA_GATEWAY/ipfs/$LATEST_IMAGE"
        
        # Проверяем доступность изображения с разных доменов
        echo ""
        echo "📱 Тест доступности из Phantom (phantom.app):"
        curl -H "Origin: https://phantom.app" \
             -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1" \
             -s -I "$PINATA_GATEWAY/ipfs/$LATEST_IMAGE" | head -10
        
        echo ""
        echo "🌐 Тест доступности из браузера:"
        curl -H "Origin: https://dashboard.example.com" \
             -s -I "$PINATA_GATEWAY/ipfs/$LATEST_IMAGE" | head -10
             
        echo ""
        echo "📊 Анализ Content-Type:"
        CONTENT_TYPE=$(curl -s -I "$PINATA_GATEWAY/ipfs/$LATEST_IMAGE" | grep -i content-type | cut -d' ' -f2- | tr -d '\r\n')
        echo "Content-Type: $CONTENT_TYPE"
        
        if [[ "$CONTENT_TYPE" == image/* ]]; then
            echo "✅ Content-Type корректен для изображения"
        else
            echo "❌ Content-Type не соответствует изображению"
        fi
        
    else
        echo "⚠️ Не найдены NFT изображения в Pinata"
    fi
else
    echo "⚠️ PINATA_API_KEY не найден, пропускаем детальную проверку"
fi

echo ""
echo "💡 Рекомендации для Phantom Wallet:"
echo "1. Используйте HTTPS Gateway URL вместо ipfs:// схемы"
echo "2. Убедитесь что Content-Type заголовки корректны"
echo "3. Проверьте CORS настройки на Pinata Gateway"
echo "4. Добавьте 'cdn: true' в properties.files для кэширования"
echo "5. Используйте external_url для дополнительной совместимости" 