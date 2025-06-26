#!/bin/bash

# Проверка индексации Compressed NFT для Phantom Wallet
echo "🔍 Проверка индексации cNFT для Phantom Wallet"
echo "=============================================="

# Получаем адрес кошелька пользователя из параметра
WALLET_ADDRESS="${1:-A27VztuDLCA3FwnELbCnoGQW83Rk5xfrL7A79A8xbDTP}"
TREE_ADDRESS="${2:-DKHMY8Nn7xofN73wCiDBLZe3qzVyA2B8X1KCE2zsJRyH}"

echo "👤 Кошелек: $WALLET_ADDRESS"
echo "🌳 Tree: $TREE_ADDRESS"
echo ""

# RPC с DAS API (те же что использует Phantom)
DAS_RPCS=(
    "https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY"
    "https://rpc.simplehash.com/solana/mainnet"
    "https://api.mainnet-beta.solana.com"
)

echo "🔎 Проверяем DAS API эндпоинты..."

for RPC in "${DAS_RPCS[@]}"; do
    echo ""
    echo "📡 Тестируем RPC: $RPC"
    
    # Проверяем getAssetsByOwner (основной метод Phantom)
    RESPONSE=$(curl -s -X POST "$RPC" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getAssetsByOwner",
            "params": {
                "ownerAddress": "'$WALLET_ADDRESS'",
                "page": 1,
                "limit": 10,
                "displayOptions": {
                    "showFungible": false,
                    "showNativeBalance": false
                }
            }
        }' 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
        ASSETS_COUNT=$(echo "$RESPONSE" | jq -r '.result.total // 0' 2>/dev/null)
        ITEMS_COUNT=$(echo "$RESPONSE" | jq -r '.result.items | length // 0' 2>/dev/null)
        
        if [ "$ASSETS_COUNT" != "null" ] && [ "$ASSETS_COUNT" != "0" ]; then
            echo "  ✅ Найдено $ASSETS_COUNT NFT (показано: $ITEMS_COUNT)"
            
            # Проверяем первый NFT на корректность метаданных
            FIRST_NFT=$(echo "$RESPONSE" | jq -r '.result.items[0] // empty' 2>/dev/null)
            if [ -n "$FIRST_NFT" ]; then
                NFT_NAME=$(echo "$FIRST_NFT" | jq -r '.content.metadata.name // "Unknown"')
                NFT_IMAGE=$(echo "$FIRST_NFT" | jq -r '.content.links.image // .content.metadata.image // "No image"')
                IS_COMPRESSED=$(echo "$FIRST_NFT" | jq -r '.compression.compressed // false')
                
                echo "  📄 Первый NFT: $NFT_NAME"
                echo "  🖼️  Изображение: $NFT_IMAGE"
                echo "  🗜️  Compressed: $IS_COMPRESSED"
                
                # Проверяем доступность изображения
                if [[ "$NFT_IMAGE" == https://* ]]; then
                    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$NFT_IMAGE")
                    if [ "$HTTP_CODE" = "200" ]; then
                        echo "  ✅ Изображение доступно (HTTP $HTTP_CODE)"
                    else
                        echo "  ❌ Изображение недоступно (HTTP $HTTP_CODE)"
                    fi
                fi
            fi
        else
            echo "  ⚠️  NFT не найдены или RPC не поддерживает DAS API"
        fi
    else
        echo "  ❌ Ошибка подключения к RPC"
    fi
done

echo ""
echo "🌳 Проверяем конкретное дерево коллекции..."

# Проверяем ассеты конкретного дерева
TREE_RESPONSE=$(curl -s -X POST "https://api.mainnet-beta.solana.com" \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getAssetsByTree",
        "params": {
            "treeId": "'$TREE_ADDRESS'",
            "page": 1,
            "limit": 5
        }
    }' 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$TREE_RESPONSE" ]; then
    TREE_ASSETS=$(echo "$TREE_RESPONSE" | jq -r '.result.total // 0' 2>/dev/null)
    echo "📊 Всего NFT в дереве: $TREE_ASSETS"
    
    if [ "$TREE_ASSETS" != "null" ] && [ "$TREE_ASSETS" != "0" ]; then
        echo "✅ Дерево содержит NFT - минтинг работает корректно"
        
        # Проверяем последние заминченные NFT
        LATEST_NFTS=$(echo "$TREE_RESPONSE" | jq -r '.result.items[] | .content.metadata.name' 2>/dev/null | head -3)
        echo "🆕 Последние NFT:"
        echo "$LATEST_NFTS" | while read -r nft_name; do
            echo "   - $nft_name"
        done
    else
        echo "❌ Дерево пустое или недоступно"
    fi
else
    echo "❌ Не удалось проверить дерево"
fi

echo ""
echo "💡 Диагностика для Phantom:"
echo "1. NFT минтятся успешно (количество в коллекции растет)"
echo "2. Phantom может не отображать NFT если:"
echo "   - Нет индексации через DAS API"
echo "   - Изображения недоступны по HTTPS"
echo "   - Некорректные CORS заголовки"
echo "   - Отсутствуют обязательные поля метаданных"
echo ""
echo "⏱️  ВАЖНО: Phantom может обновляться с задержкой 5-30 минут!"
echo "🔄 Попробуйте:"
echo "   1. Перезапустить Phantom"
echo "   2. Обновить кошелек (потянуть вниз)"
echo "   3. Подождать 30 минут"
echo "   4. Проверить в Solscan Explorer" 