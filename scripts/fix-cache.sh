#!/bin/bash

# Скрипт для исправления проблем с кэшем Next.js
# Использование: ./scripts/fix-cache.sh [dev|build|full]

echo "🧹 Исправление проблем с кэшем Next.js..."

# Функция очистки базового кэша
clean_basic() {
    echo "Удаление .next кэша..."
    rm -rf .next
    
    echo "Удаление node_modules кэша..."
    rm -rf node_modules/.cache
    
    echo "✅ Базовая очистка завершена"
}

# Функция полной очистки
clean_full() {
    clean_basic
    
    echo "Удаление всех node_modules..."
    rm -rf node_modules
    
    echo "Переустановка зависимостей..."
    pnpm install
    
    echo "✅ Полная очистка завершена"
}

# Проверка аргументов
case "${1:-dev}" in
    "dev")
        clean_basic
        echo "🚀 Запуск сервера разработки..."
        pnpm dev
        ;;
    "build")
        clean_basic
        echo "🔨 Запуск сборки..."
        pnpm build
        ;;
    "full")
        clean_full
        echo "🚀 Запуск сервера разработки..."
        pnpm dev
        ;;
    *)
        echo "Использование: $0 [dev|build|full]"
        echo "  dev   - очистка кэша + запуск dev сервера (по умолчанию)"
        echo "  build - очистка кэша + сборка"
        echo "  full  - полная переустановка + запуск dev сервера"
        exit 1
        ;;
esac 