#!/bin/bash

# Скрипт для проверки NFT метаданных в Pinata
# Диагностика проблем с отображением NFT в кошельках

echo "🔍 Диагностика NFT метаданных"
echo "================================"

# Проверка переменных окружения
if [ -z "$PINATA_API_KEY" ] || [ -z "$PINATA_SECRET_KEY" ]; then
    echo "❌ Переменные PINATA_API_KEY и PINATA_SECRET_KEY не найдены"
    echo "Установите их в .env файле"
    exit 1
fi

PINATA_GATEWAY="https://amber-accused-tortoise-973.mypinata.cloud"
TEMP_DIR="/tmp/nft-metadata-check"
mkdir -p "$TEMP_DIR"

echo "📋 Получение списка JSON файлов из Pinata..."

# Получаем список файлов из Pinata
PINATA_LIST=$(curl -s -X GET \
  "https://api.pinata.cloud/data/pinList?status=pinned&metadata[name]=metadata" \
  -H "Authorization: Bearer $PINATA_API_KEY")

if [ $? -ne 0 ]; then
    echo "❌ Ошибка получения списка файлов из Pinata"
    exit 1
fi

echo "$PINATA_LIST" | jq -r '.rows[] | select(.metadata.name | contains("metadata")) | .ipfs_pin_hash' | head -5 | while read hash; do
    if [ -n "$hash" ]; then
        echo ""
        echo "🔎 Проверка метаданных: $hash"
        echo "URL: $PINATA_GATEWAY/ipfs/$hash"
        
        # Скачиваем и проверяем JSON
        METADATA_FILE="$TEMP_DIR/$hash.json"
        curl -s "$PINATA_GATEWAY/ipfs/$hash" > "$METADATA_FILE"
        
        if [ $? -eq 0 ] && [ -s "$METADATA_FILE" ]; then
            echo "✅ Метаданные загружены"
            
            # Проверяем обязательные поля
            NAME=$(jq -r '.name // "ОТСУТСТВУЕТ"' "$METADATA_FILE")
            SYMBOL=$(jq -r '.symbol // "ОТСУТСТВУЕТ"' "$METADATA_FILE")
            IMAGE=$(jq -r '.image // "ОТСУТСТВУЕТ"' "$METADATA_FILE")
            SELLER_FEE=$(jq -r '.seller_fee_basis_points // "ОТСУТСТВУЕТ"' "$METADATA_FILE")
            CREATORS=$(jq -r '.properties.creators | length // 0' "$METADATA_FILE")
            
            echo "  📝 name: $NAME"
            echo "  🏷️  symbol: $SYMBOL"
            echo "  🖼️  image: $IMAGE"
            echo "  💰 seller_fee_basis_points: $SELLER_FEE"
            echo "  👤 creators count: $CREATORS"
            
            # Проверяем доступность изображения
            if [ "$IMAGE" != "ОТСУТСТВУЕТ" ] && [ "$IMAGE" != "null" ]; then
                HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$IMAGE")
                if [ "$HTTP_CODE" = "200" ]; then
                    echo "  ✅ Изображение доступно (HTTP $HTTP_CODE)"
                else
                    echo "  ❌ Изображение недоступно (HTTP $HTTP_CODE)"
                fi
            else
                echo "  ❌ Отсутствует URL изображения"
            fi
            
            # Проверяем структуру creators
            CREATOR_ADDR=$(jq -r '.properties.creators[0].address // "ОТСУТСТВУЕТ"' "$METADATA_FILE")
            CREATOR_SHARE=$(jq -r '.properties.creators[0].share // "ОТСУТСТВУЕТ"' "$METADATA_FILE")
            
            if [ "$CREATORS" -gt 0 ]; then
                echo "  👤 Creator: $CREATOR_ADDR (share: $CREATOR_SHARE%)"
            else
                echo "  ❌ Отсутствуют creators - критическая ошибка!"
            fi
            
            # Диагностика проблем
            echo "  🔍 Диагностика:"
            if [ "$SELLER_FEE" = "ОТСУТСТВУЕТ" ]; then
                echo "    ⚠️  Отсутствует seller_fee_basis_points"
            fi
            if [ "$CREATORS" -eq 0 ]; then
                echo "    ❌ Пустой массив creators - NFT не будет отображаться"
            fi
            if [ "$SYMBOL" = "PECAMP" ]; then
                echo "    ⚠️  Используется неправильный символ PECAMP вместо PES"
            fi
            
        else
            echo "❌ Не удалось загрузить метаданные"
        fi
        
        # Удаляем временный файл
        rm -f "$METADATA_FILE"
    fi
done

echo ""
echo "🎯 Резюме проблем:"
echo "1. Пустые creators[] - основная причина невидимости NFT"
echo "2. Отсутствие seller_fee_basis_points нарушает стандарт"
echo "3. Неправильный символ коллекции"
echo ""
echo "💡 Решение: Переминтить NFT с исправленными метаданными"

# Очистка
rm -rf "$TEMP_DIR" 