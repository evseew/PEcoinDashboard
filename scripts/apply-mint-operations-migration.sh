#!/bin/bash

# Скрипт для применения миграции таблицы mint_operations
# Использует переменные окружения для подключения к Supabase

echo "🚀 Применение миграции mint_operations..."

# Проверяем наличие psql
if ! command -v psql &> /dev/null; then
    echo "❌ psql не найден. Установите PostgreSQL client."
    exit 1
fi

# Проверяем переменные окружения
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  SUPABASE_DB_URL не установлен. Попробуйте установить через .env файл"
    
    # Пытаемся загрузить из .env
    if [ -f ".env" ]; then
        echo "📄 Загружаем переменные из .env файла..."
        export $(grep -v '^#' .env | xargs)
    fi
    
    # Если всё ещё нет URL, пытаемся сконструировать из частей
    if [ -z "$SUPABASE_DB_URL" ] && [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_DB_PASSWORD" ]; then
        # Извлекаем project_id из SUPABASE_URL (https://your-project.supabase.co)
        PROJECT_ID=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')
        SUPABASE_DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_ID}.supabase.co:5432/postgres"
        echo "🔧 Сконструирован DB_URL: $SUPABASE_DB_URL"
    fi
fi

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Не удалось определить SUPABASE_DB_URL"
    echo "Пожалуйста, установите одну из переменных:"
    echo "  SUPABASE_DB_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres"
    echo "  или SUPABASE_URL + SUPABASE_DB_PASSWORD"
    exit 1
fi

echo "🔗 Подключаемся к базе данных..."
echo "URL: $(echo $SUPABASE_DB_URL | sed 's/:.*@/:***@/')"

# Применяем миграцию
echo "📝 Применяем миграцию mint_operations..."

psql "$SUPABASE_DB_URL" -f migrations/create_mint_operations_table.sql

if [ $? -eq 0 ]; then
    echo "✅ Миграция mint_operations успешно применена!"
    
    # Проверяем создание таблицы
    echo "🔍 Проверяем структуру таблицы..."
    psql "$SUPABASE_DB_URL" -c "\d mint_operations"
    
    echo ""
    echo "📊 Проверяем статистику таблицы..."
    psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) as total_operations, COUNT(CASE WHEN status='completed' THEN 1 END) as completed FROM mint_operations;"
    
    echo ""
    echo "🎉 Таблица mint_operations готова к использованию!"
    echo "   - История минтинга теперь будет сохраняться при перезапуске"
    echo "   - Создано представление mint_operations_summary для аналитики"
    echo "   - Настроены индексы для быстрого поиска"
    
else
    echo "❌ Ошибка применения миграции!"
    exit 1
fi 