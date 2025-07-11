# PEcoin Dashboard

Дашборд для экосистемы PEcoin с полной системой кэширования и глобальным управлением данными.

<!-- 🧪 ТЕСТ АВТОДЕПЛОЯ VERCEL - ПРИВАТНЫЙ РЕПО -->

## 🚀 Ключевые возможности

- **Динамическое глобальное кэширование** - автоматическое получение участников из основной системы
- **Мгновенный доступ к данным** - все данные экосистемы доступны в реальном времени из памяти
- **Автоматическая синхронизация** - периодическое обновление списка участников и их данных
- **Многоуровневое кэширование** - NFT, транзакции, балансы, изображения
- **Batch-операции** - оптимизированная загрузка данных для всех участников

## 🏗️ Архитектура кэширования

### 1. Динамическое глобальное кэширование
- **Источник данных**: API `/api/entities/teams`, `/api/entities/startups`, `/api/entities/staff`
- **Автообновление**: список участников каждые 30 минут, данные каждые 5 минут
- **Типы участников**: команды, стартапы и сотрудники с кошельками
- **Производительность**: доступ к данным за 1-5ms

### 2. Индивидуальное API кэширование
- **NFT коллекции**: 10 минут TTL
- **Балансы токенов**: 2 минуты TTL  
- **История транзакций**: 2 минуты TTL
- **Изображения**: 1 час TTL с прокси

### 3. Умная оптимизация
- **Batch-загрузка балансов**: все участники одним запросом
- **Параллельная загрузка NFT**: батчи по 8 участников
- **Селективная загрузка транзакций**: только для активных участников (баланс > 0)

## 📋 API Endpoints

### Динамическое кэширование экосистемы
```bash
# Автоматическая инициализация
POST /api/ecosystem-init

# Статистика экосистемы
GET /api/dynamic-ecosystem?action=stats

# Данные участника
GET /api/dynamic-ecosystem?action=participant&wallet={address}

# Список всех участников
GET /api/dynamic-ecosystem?action=participants

# Обновление всех данных
POST /api/dynamic-ecosystem {"action": "refresh"}

# Обновление участника
POST /api/dynamic-ecosystem {"action": "refresh", "walletAddress": "..."}

# Обновление списка участников
POST /api/dynamic-ecosystem {"action": "refresh-participants"}
```

### Источники данных участников
```bash
# Команды
GET /api/entities/teams

# Стартапы
GET /api/entities/startups

# Сотрудники
GET /api/entities/staff
```

### Классическое кэширование
```bash
# NFT коллекции
POST /api/nft-collection {"walletAddress": "..."}

# Балансы токенов (batch)
POST /api/token-balances {"wallets": [...], "mint": "..."}

# История транзакций
POST /api/pecoin-history {"walletAddress": "...", "limit": 10}

# Прокси изображений
GET /api/image-proxy?url={encoded_url}
```

## 🧪 Тестирование

### Запуск сервера
```bash
npm run dev
```

### Тест динамического кэширования
```bash
node test-dynamic-ecosystem.js
```

Тест проверяет:
- ✅ Доступность API entities (команды, стартапы, сотрудники)
- ✅ Автоматическую инициализацию экосистемы
- ✅ Мгновенный доступ к данным участников
- ✅ Обновление списка участников
- ✅ Статистику и производительность

### Тест индивидуального кэширования
```bash
node test-tx-cache.js
```

## ⚡ Производительность

### Глобальное кэширование
- **Время инициализации**: ~10-30 секунд (в зависимости от количества участников)
- **Доступ к данным**: 1-5ms для любого участника
- **Масштабируемость**: поддержка 50+ участников
- **Память**: ~50-200MB для полной экосистемы

### Индивидуальное кэширование  
- **Ускорение транзакций**: 9.5x для повторных запросов
- **Ускорение NFT**: 15x для повторных запросов
- **Cache hit rate**: 90%+ при активном использовании

## 🔧 Конфигурация

### Интервалы обновления
```typescript
// lib/dynamic-ecosystem-cache.ts
GLOBAL_REFRESH_INTERVAL = 5 * 60 * 1000        // 5 минут - данные
PARTICIPANTS_REFRESH_INTERVAL = 30 * 60 * 1000 // 30 минут - участники
```

### TTL кэширования
```typescript
// lib/server-cache.ts
TOKEN_BALANCE: 2 * 60 * 1000           // 2 минуты
NFT_COLLECTION: 10 * 60 * 1000         // 10 минут  
TRANSACTION_HISTORY: 2 * 60 * 1000     // 2 минуты
IMAGE_PROXY: 60 * 60 * 1000            // 1 час
```

## 🌐 Экосистема PEcoin

### Автоматическое обнаружение участников
Система автоматически получает список участников из:
- **API команд**: `/api/entities/teams` 
- **API стартапов**: `/api/entities/startups`
- **API сотрудников**: `/api/entities/staff`

### Требования к участникам
- Наличие поля `walletAddress` (в формате `wallet_address` в базе)
- Валидный Solana кошелек
- Поле `name` для отображения

### Динамическое масштабирование
- Добавление новых команд/стартапов/сотрудников → автоматическое включение в кэш
- Удаление участников → автоматическая очистка кэша
- Изменение кошельков → автоматическое обновление данных

## 🚀 Развертывание

### Автоматическая инициализация
При запуске приложения система автоматически:
1. Получает список участников из основных API (команды, стартапы, сотрудники)
2. Загружает все данные в память
3. Запускает периодические обновления
4. Предоставляет мгновенный доступ к данным

### Мониторинг
- Логи инициализации и обновлений
- Статистика кэша и производительности  
- Отслеживание ошибок и таймаутов

## 🛠️ Решение проблем с кэшем

### Проблемы с кэшем Next.js
Если возникают ошибки типа `Cannot find module middleware-manifest.json`, используйте:

#### Быстрые команды:
```bash
# Очистка кэша и запуск dev сервера
npm run dev:clean

# Только очистка кэша
npm run clean

# Полная переустановка зависимостей
npm run clean:all

# Очистка + сборка проекта
npm run build:clean

# Быстрое восстановление
npm run reset
```

#### Автоматический скрипт:
```bash
# Очистка кэша + dev сервер (по умолчанию)
./scripts/fix-cache.sh

# Очистка кэша + сборка
./scripts/fix-cache.sh build

# Полная переустановка + dev сервер
./scripts/fix-cache.sh full
```

#### Ручная очистка:
```bash
# Удаление поврежденного кэша
rm -rf .next
rm -rf node_modules/.cache

# Запуск сервера
pnpm dev
```

### Предотвращение проблем:
1. **Не прерывайте сборку** резко (Ctrl+C вместо принудительного завершения)
2. **При изменениях в middleware** всегда делайте `npm run clean`
3. **При странных ошибках** используйте `npm run reset`
4. **Регулярно очищайте кэш** при активной разработке

---

**💡 Ключевое преимущество**: Система полностью адаптируется под изменения в основных данных экосистемы без необходимости ручной конфигурации участников. 