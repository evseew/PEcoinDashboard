#!/bin/bash

# Проверка последних заминченных NFT в дереве
TREE_ADDRESS="DKHMY8Nn7xofN73wCiDBLZe3qzVyA2B8X1KCE2zsJRyH"
TARGET_WALLET="${1:-A27VztuDLCA3FwnELbCnoGQW83Rk5xfrL7A79A8xbDTP}"

echo "🔍 Проверяем последние NFT в дереве..."
echo "Tree: $TREE_ADDRESS"
echo "Target wallet: $TARGET_WALLET"
echo "---"

# Проверка через Helius DAS API
echo "📡 Checking via Helius DAS API..."
curl -X POST \
  "https://mainnet.helius-rpc.com/?api-key=22e26fc3-9bb8-4e22-bb62-3f2b57b0c5ed" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "text",
    "method": "getAssetsByOwner",
    "params": {
      "ownerAddress": "'$TARGET_WALLET'",
      "page": 1,
      "limit": 5,
      "displayOptions": {
        "showFungible": false,
        "showNativeBalance": false
      }
    }
  }' | jq '.result.items[] | select(.compression.tree == "'$TREE_ADDRESS'") | {
    name: .content.metadata.name,
    tree: .compression.tree,
    owner: .ownership.owner,
    image: .content.files[0].uri
  }'

echo ""
echo "---"
echo "💡 Если NFT отображаются здесь с tree=$TREE_ADDRESS, то минтинг идет на правильный кошелек"
echo "💡 Если NFT нет - проверьте какой адрес указываете при минтинге" 