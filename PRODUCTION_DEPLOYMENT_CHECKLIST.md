# 🚀 Чеклист деплоя в продакшен

## ⚠️ КРИТИЧЕСКИЕ ДЕЙСТВИЯ ДЛЯ ДЕПЛОЯ

### 🔧 1. Конфигурация окружений

#### Vercel Environment Variables:
```bash
# === ОСНОВНЫЕ (обязательные) ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key

# === ПРИЛОЖЕНИЕ ===
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production

# === API ENDPOINTS ===
NEXT_PUBLIC_EXTERNAL_API_URL=https://your-backend.domain.com
NEXT_PUBLIC_EXTERNAL_API_KEY=production_api_key_2024
NEXT_PUBLIC_ENABLE_EXTERNAL_API=true

# === SOLANA ===
NEXT_PUBLIC_ALCHEMY_API_KEY=your_production_alchemy_key
NEXT_PUBLIC_PECOIN_MINT=FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r
NEXT_PUBLIC_MINTING_WALLET=5JbDcHSKkPnptsGKS7oZjir2FuALJURf5p9fqAPt4Z6t

# === NFT MINTING (секретные!) ===
PINATA_API_KEY=your_production_pinata_key
PINATA_SECRET_KEY=your_production_pinata_secret
PRIVATE_KEY=your_production_wallet_private_key
RPC_URL=your_production_solana_rpc
ALCHEMY_URL=your_production_alchemy_rpc

# === ФИЧИ ===
NEXT_PUBLIC_ENABLE_ECOSYSTEM_CACHE=true
NEXT_PUBLIC_ENABLE_TRANSACTION_CACHE=true
```

## 📋 ПОШАГОВЫЙ ПЛАН ДЕПЛОЯ

### **Этап 1: Подготовка**
- [ ] Убери удаленные файлы из git: `git add . && git commit -m "Remove deleted migrations"`
- [ ] Проверь сборку локально: `npm run build`
- [ ] Запусти линтер: `npm run lint` 
- [ ] Проверь типы: `npm run type-check`

### **Этап 2: Backend деплой**
- [ ] Деплой backend на продакшен сервер (Timeweb/другой)
- [ ] Обнови переменные окружения backend (.env):
  ```bash
  NODE_ENV=production
  PORT=8080
  API_KEY=production_api_key_2024
  PRIVATE_KEY=your_production_private_key
  RPC_URL=your_production_rpc
  PINATA_API_KEY=your_production_pinata_key
  PINATA_SECRET_API_KEY=your_production_pinata_secret
  ```
- [ ] Проверь health check: `curl https://your-backend.domain.com/health`

### **Этап 3: Frontend деплой**
- [ ] Слей ветку: `git checkout main && git merge development`
- [ ] Пуш в main: `git push origin main`
- [ ] В Vercel Dashboard:
  - [ ] Выбери проект
  - [ ] Settings → Environment Variables
  - [ ] Добавь все переменные из списка выше
  - [ ] Deploy

### **Этап 4: Настройка БД**
- [ ] В Supabase Dashboard → Settings → API
- [ ] Добавь домены в CORS:
  ```
  https://your-domain.vercel.app
  https://*.vercel.app
  ```
- [x] ✅ Таблицы уже созданы и протестированы

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ДЕПЛОЯ

### API Endpoints:
```bash
# Основные API
curl https://your-domain.vercel.app/api/entities/teams
curl https://your-domain.vercel.app/api/entities/startups
curl https://your-domain.vercel.app/api/entities/staff

# Инициализация экосистемы
curl -X POST https://your-domain.vercel.app/api/ecosystem-init

# Статистика кэша
curl https://your-domain.vercel.app/api/dynamic-ecosystem?action=stats

# NFT Collections
curl https://your-domain.vercel.app/api/nft-collection
```

### В браузере:
- [ ] Откройте сайт
- [ ] F12 → Console - проверьте инициализацию:
  ```
  ✅ Динамическая экосистема успешно инициализирована!
  ```
- [ ] Проверьте dashboard с данными
- [ ] Протестируйте admin панель (/admin)
- [ ] Протестируйте NFT minting (/admin/nft-minting)

## 🚨 ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Ошибки сборки:
```bash
# Очистка и пересборка
npm run clean
npm run build
```

### API ошибки:
- [ ] Проверь переменные окружения в Vercel
- [ ] Проверь CORS в Supabase  
- [ ] Проверь доступность backend

### Slow Performance:
- [ ] Проверь инициализацию кэша в логах Vercel
- [ ] Убедись что Alchemy API key работает
- [ ] Проверь что все API ответы кэшируются

## ✅ ФИНАЛЬНАЯ ПРОВЕРКА

- [ ] Сайт загружается ✅
- [ ] API работают ✅
- [ ] Dashboard показывает данные ✅
- [ ] Admin панель доступна ✅
- [ ] NFT minting функционирует ✅
- [ ] Кэш инициализирован ✅
- [ ] Нет ошибок в консоли ✅

## 🔄 ОТКАТ (если что-то пошло не так)

```bash
# Быстрый откат на предыдущую версию
git checkout main
git reset --hard HEAD~1
git push origin main --force

# Или в Vercel Dashboard → Deployments → Revert
```

---

**🎯 Цель:** Плавный переход development → production без даунтайма!

**⏰ Ожидаемое время:** 2-3 часа с тестированием

**🏆 Результат:** Стабильно работающий продакшен! 🚀 