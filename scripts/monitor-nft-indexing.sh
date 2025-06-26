#!/bin/bash

# Мониторинг индексации NFT для Phantom Wallet
echo "🔄 Мониторинг индексации NFT"
echo "============================"

WALLET="${1:-A27VztuDLCA3FwnELbCnoGQW83Rk5xfrL7A79A8xbDTP}"
TREE="${2:-DKHMY8Nn7xofN73wCiDBLZe3qzVyA2B8X1KCE2zsJRyH}"
COLLECTION="${3:-F1mKEFsnEz8bm4Ty2mTFrgsCcXmmMroQzRFEzc2s7B8e}"

echo "👤 Кошелек: $WALLET"
echo "🌳 Дерево: $TREE"
echo "📦 Коллекция: $COLLECTION"
echo ""

# DAS API endpoints (те же что использует Phantom)
DAS_APIS=(
    "https://rpc.helius.xyz/?api-key=b8a9344f-48e3-442b-8482-fe2502a31fa4"
    "https://mainnet.helius-rpc.com/?api-key=b8a9344f-48e3-442b-8482-fe2502a31fa4"
    "https://api.mainnet-beta.solana.com"
)

check_das_api() {
    local api_url=$1
    local api_name=$2
    
    echo "📡 Проверяем $api_name..."
    
    # Проверяем NFT по владельцу
    local owner_response=$(curl -s -X POST "$api_url" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getAssetsByOwner",
            "params": {
                "ownerAddress": "'$WALLET'",
                "page": 1,
                "limit": 10,
                "displayOptions": {
                    "showFungible": false
                }
            }
        }')
    
    local owner_count=$(echo "$owner_response" | jq -r '.result.total // 0' 2>/dev/null)
    
    # Проверяем NFT по дереву
    local tree_response=$(curl -s -X POST "$api_url" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0", 
            "id": 1,
            "method": "getAssetsByTree",
            "params": {
                "treeId": "'$TREE'",
                "page": 1,
                "limit": 5
            }
        }')
    
    local tree_count=$(echo "$tree_response" | jq -r '.result.total // 0' 2>/dev/null)
    
    # Проверяем NFT по коллекции
    local collection_response=$(curl -s -X POST "$api_url" \
        -H "Content-Type: application/json" \
        -d '{
            "jsonrpc": "2.0",
            "id": 1, 
            "method": "getAssetsByGroup",
            "params": {
                "groupKey": "collection",
                "groupValue": "'$COLLECTION'",
                "page": 1,
                "limit": 5
            }
        }')
    
    local collection_count=$(echo "$collection_response" | jq -r '.result.total // 0' 2>/dev/null)
    
    echo "  👤 NFT по владельцу: $owner_count"
    echo "  🌳 NFT в дереве: $tree_count"
    echo "  📦 NFT в коллекции: $collection_count"
    
    # Показываем детали первого NFT если есть
    if [ "$owner_count" != "0" ] && [ "$owner_count" != "null" ]; then
        local first_nft=$(echo "$owner_response" | jq -r '.result.items[0] // empty' 2>/dev/null)
        if [ -n "$first_nft" ]; then
            local nft_name=$(echo "$first_nft" | jq -r '.content.metadata.name // "Unknown"')
            local nft_image=$(echo "$first_nft" | jq -r '.content.links.image // .content.metadata.image // "No image"')
            local is_compressed=$(echo "$first_nft" | jq -r '.compression.compressed // false')
            
            echo "  📄 Первый NFT: $nft_name"
            echo "  🖼️  Изображение: $nft_image"
            echo "  🗜️  Compressed: $is_compressed"
        fi
    fi
    
    echo ""
}

# Основной цикл мониторинга
while true; do
    echo "⏰ $(date '+%Y-%m-%d %H:%M:%S') - Проверка индексации..."
    echo ""
    
    for api in "${DAS_APIS[@]}"; do
        if [[ "$api" == *"helius"* ]]; then
            check_das_api "$api" "Helius"
        else
            check_das_api "$api" "Solana RPC"
        fi
    done
    
    echo "💡 Phantom Wallet проверяет индексацию каждые 5-10 минут"
    echo "⏱️  Ожидание 30 секунд до следующей проверки..."
    echo "════════════════════════════════════════════════════"
    
    sleep 30
done 