#!/bin/bash

echo "🚀 СРОЧНАЯ ОЧИСТКА ВСЕХ КЕШЕЙ для ускорения загрузки"
echo "============================================="

# 1. Очистка кеша балансов токенов (самое важное)
echo "🔥 Очищаю кеш балансов токенов..."
curl -X POST http://localhost:3000/api/cache-stats \
  -H "Content-Type: application/json" \
  -d '{"action": "clear", "type": "TOKEN_BALANCE"}' 2>/dev/null || echo "⚠️ API недоступен"

# 2. Очистка серверного кеша
echo "🧹 Очищаю серверный кеш..."
curl -X POST http://localhost:3000/api/cache-stats \
  -H "Content-Type: application/json" \
  -d '{"action": "cleanup"}' 2>/dev/null || echo "⚠️ API недоступен"

# 3. Принудительная очистка памяти Node.js (если возможно)
echo "🔄 Принудительная сборка мусора..."
curl -X POST http://localhost:3000/api/cache-stats \
  -H "Content-Type: application/json" \
  -d '{"action": "gc"}' 2>/dev/null || echo "⚠️ API недоступен"

# 4. Очистка кеша NFT коллекций  
echo "🖼️ Очищаю кеш NFT..."
curl -X POST http://localhost:3000/api/cache-stats \
  -H "Content-Type: application/json" \
  -d '{"action": "clear", "type": "NFT_COLLECTION"}' 2>/dev/null || echo "⚠️ API недоступен"

# 5. Очистка браузерного кеша через localStorage (для development)
echo "💾 Очищаю локальные кеши..."
if command -v node >/dev/null 2>&1; then
    node -e "
    if (typeof localStorage !== 'undefined') {
        localStorage.clear();
        console.log('LocalStorage очищен');
    }
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear(); 
        console.log('SessionStorage очищен');
    }
    " 2>/dev/null || echo "⚠️ Браузерные кеши недоступны"
fi

echo ""
echo "✅ КЕШИ ОЧИЩЕНЫ! Перезапустите приложение для максимального ускорения:"
echo "🔄 npm run dev"
echo ""
echo "📊 Проверить статистику кеша:"
echo "curl http://localhost:3000/api/cache-stats"
echo "" 