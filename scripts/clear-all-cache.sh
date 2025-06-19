#!/bin/bash

echo "🧹 Полная очистка всех кэшей..."

# Останавливаем dev сервер если он запущен
echo "Убиваем все процессы next..."
pkill -f "next"

# Удаляем .next кэш
echo "Удаляем .next кэш..."
rm -rf .next

# Удаляем TypeScript build cache
echo "Удаляем TypeScript build cache..."
rm -f tsconfig.tsbuildinfo

# Удаляем node_modules cache
echo "Удаляем node_modules cache..."
rm -rf node_modules/.cache

# Очищаем pnpm cache
echo "Очищаем pnpm cache..."
pnpm store prune

# Очищаем browser cache hint
echo "Очищаем ESLint cache..."
rm -rf .eslintcache

echo "✅ Все кэши очищены!"
echo "🚀 Теперь запустите: pnpm dev" 