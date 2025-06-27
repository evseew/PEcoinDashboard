#!/bin/bash

# Скрипт исправления Nginx прокси для Vercel
echo "🔧 Исправляем Nginx прокси для Vercel..."

# Создаем новую конфигурацию с динамическим DNS
cat > /etc/nginx/sites-available/pecoin-proxy << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name pecoin.ru www.pecoin.ru;

    # Логирование для отладки
    access_log /var/log/nginx/pecoin_proxy.access.log;
    error_log /var/log/nginx/pecoin_proxy.error.log debug;

    location / {
        # КРИТИЧНО: Используем переменную для динамического разрешения DNS
        set $vercel_backend "https://pecoin-dashboard.vercel.app";
        proxy_pass $vercel_backend;
        
        # Правильные заголовки
        proxy_set_header Host pecoin-dashboard.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # ПОЛНОСТЬЮ отключаем кэширование
        proxy_cache off;
        proxy_buffering off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        
        # Заголовки для отключения кэша браузера
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        
        # Короткие таймауты для быстрого переключения
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
        
        # DNS resolver с очень коротким TTL
        resolver 8.8.8.8 8.8.4.4 1.1.1.1 valid=10s;
        resolver_timeout 3s;
    }

    # Специальная обработка для API
    location /api/ {
        set $vercel_backend "https://pecoin-dashboard.vercel.app";
        proxy_pass $vercel_backend;
        
        proxy_set_header Host pecoin-dashboard.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Полное отключение кэша для API
        proxy_cache off;
        proxy_buffering off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        
        resolver 8.8.8.8 8.8.4.4 1.1.1.1 valid=10s;
        resolver_timeout 3s;
    }
}
EOF

# Включаем сайт
ln -sf /etc/nginx/sites-available/pecoin-proxy /etc/nginx/sites-enabled/

# Тестируем конфигурацию
echo "🧪 Тестируем конфигурацию Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Конфигурация корректна, перезапускаем Nginx..."
    systemctl reload nginx
    
    # Очищаем DNS кэш системы
    echo "🧹 Очищаем DNS кэш..."
    systemctl flush-dns 2>/dev/null || true
    systemd-resolve --flush-caches 2>/dev/null || true
    
    echo "✅ Nginx успешно перезапущен!"
    echo "🔍 Проверяем новую конфигурацию..."
    
    # Проверяем что всё работает
    sleep 2
    curl -I http://localhost/api/health 2>/dev/null | head -5
    
else
    echo "❌ Ошибка в конфигурации Nginx!"
    exit 1
fi 