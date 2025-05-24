# 🚀 Деплой PEcoin Dashboard на Vercel

Пошаговая инструкция по развертыванию приложения на Vercel.

## 📋 Предварительные требования

1. **GitHub аккаунт** с репозиторием проекта
2. **Vercel аккаунт** (можно зарегистрироваться через GitHub)
3. **Supabase проект** с настроенными таблицами
4. **Alchemy API ключ** для работы с Solana

## 🔧 Подготовка к деплою

### 1. Создание GitHub репозитория

```bash
# Если репозиторий еще не создан
git init
git add .
git commit -m "Initial commit: PEcoin Dashboard with dynamic ecosystem caching"

# Создайте репозиторий на GitHub и добавьте remote
git remote add origin https://github.com/your-username/pecoin-dashboard.git
git branch -M main
git push -u origin main
```

### 2. Подготовка переменных окружения

Создайте файл `.env.local` (локально) со следующими переменными:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Alchemy Configuration  
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app

# PEcoin Configuration
NEXT_PUBLIC_PECOIN_MINT=FDT9EMUytSwaP8GKiKdyv59rRAsT7gAB57wHUPm7wY9r

# Optional features
NEXT_PUBLIC_ENABLE_ECOSYSTEM_CACHE=true
NEXT_PUBLIC_ENABLE_TRANSACTION_CACHE=true
```

## 🌐 Деплой на Vercel

### Вариант 1: Через Vercel Dashboard (рекомендуется)

1. **Зайдите на [vercel.com](https://vercel.com)**
2. **Войдите через GitHub**
3. **Нажмите "New Project"**
4. **Выберите ваш репозиторий** `pecoin-dashboard`
5. **Настройте проект:**
   - Framework Preset: `Next.js`
   - Root Directory: `./Pecoin Dashboard`
   - Build Command: `npm run build`
   - Output Directory: `.next`

6. **Добавьте переменные окружения:**
   - В разделе "Environment Variables" добавьте все переменные из `.env.local`
   - Убедитесь, что они доступны для Production, Preview и Development

7. **Нажмите "Deploy"**

### Вариант 2: Через Vercel CLI

```bash
# Установка Vercel CLI
npm i -g vercel

# Логин в Vercel
vercel login

# Перейти в папку проекта
cd "Pecoin Dashboard"

# Деплой
vercel

# Следуйте инструкциям:
# ? Set up and deploy "~/path/to/Pecoin Dashboard"? [Y/n] y
# ? Which scope do you want to deploy to? Your Personal Account
# ? Link to existing project? [y/N] n
# ? What's your project's name? pecoin-dashboard
# ? In which directory is your code located? ./

# Добавление переменных окружения
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_ALCHEMY_API_KEY
# ... добавьте все необходимые переменные

# Финальный деплой
vercel --prod
```

## ⚙️ Настройка Supabase

### Настройка CORS для Vercel

В настройках Supabase добавьте ваш Vercel домен:

1. **Зайдите в Supabase Dashboard**
2. **Settings → API**
3. **В разделе "URL Configuration" добавьте:**
   ```
   https://your-app-domain.vercel.app
   https://*.vercel.app
   ```

### Проверка таблиц

Убедитесь, что у вас есть таблицы:
- `teams` (id, name, wallet_address, description, logo_url, achievements)
- `startups` (id, name, wallet_address, description, logo_url, achievements)  
- `staff` (id, name, wallet_address, description, logo_url)

## 🔍 Проверка деплоя

### 1. Проверка API endpoints

```bash
# Проверка основных API
curl https://your-app.vercel.app/api/entities/teams
curl https://your-app.vercel.app/api/entities/startups
curl https://your-app.vercel.app/api/entities/staff

# Проверка инициализации экосистемы
curl -X POST https://your-app.vercel.app/api/ecosystem-init

# Проверка статистики
curl https://your-app.vercel.app/api/dynamic-ecosystem?action=stats
```

### 2. Проверка в браузере

1. **Откройте ваш сайт**
2. **Откройте DevTools (F12)**
3. **Проверьте консоль** на наличие сообщений инициализации:
   ```
   🌐 Запуск автоматической инициализации динамической экосистемы...
   ✅ Динамическая экосистема успешно инициализирована!
   ```

## 🔧 Возможные проблемы и решения

### Ошибка сборки (Build Error)

```bash
# Если ошибки TypeScript
npm run type-check

# Если ошибки ESLint
npm run lint

# Если ошибки зависимостей
npm install
```

### Ошибки API

1. **Проверьте переменные окружения** в Vercel Dashboard
2. **Убедитесь, что Supabase доступен** с продакшена
3. **Проверьте CORS настройки** в Supabase

### Медленная загрузка

1. **Проверьте инициализацию кэша** в логах Vercel
2. **Убедитесь, что API ответы кэшируются**
3. **Проверьте, что Alchemy API ключ валиден**

## 📊 Мониторинг

### Vercel Analytics

1. **Включите Vercel Analytics** в настройках проекта
2. **Мониторьте производительность** в Vercel Dashboard
3. **Отслеживайте ошибки** в логах функций

### Проверка кэша

Откройте консоль браузера и проверьте:
```javascript
// Статистика экосистемы
fetch('/api/dynamic-ecosystem?action=stats')
  .then(r => r.json())
  .then(console.log)

// Список участников  
fetch('/api/dynamic-ecosystem?action=participants')
  .then(r => r.json())
  .then(console.log)
```

## 🎉 Готово!

Ваш PEcoin Dashboard теперь доступен по адресу:
**https://your-app-domain.vercel.app**

### Основные возможности:
- ✅ Динамическое глобальное кэширование экосистемы
- ✅ Автоматическая синхронизация участников
- ✅ Мгновенный доступ к данным (1-5ms)
- ✅ Поддержка команд, стартапов и сотрудников
- ✅ Кэширование NFT, транзакций и балансов
- ✅ Адаптивный дизайн для всех устройств 