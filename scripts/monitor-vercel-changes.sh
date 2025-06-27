#!/bin/bash

# Мониторинг изменений Vercel для быстрого реагирования
VERCEL_DOMAIN="pecoin-dashboard.vercel.app"
PROXY_DOMAIN="pecoin.ru"
LOG_FILE="/var/log/vercel-monitor.log"

echo "🔍 Запускаем мониторинг Vercel изменений..."

# Функция логирования
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Проверка IP-адресов
check_ips() {
    log "Проверяем IP-адреса для $VERCEL_DOMAIN"
    
    # Получаем актуальные IP
    CURRENT_IPS=$(dig +short "$VERCEL_DOMAIN" | sort)
    
    # Сохраняем в файл для сравнения
    IP_FILE="/tmp/vercel_ips_current.txt"
    echo "$CURRENT_IPS" > "$IP_FILE"
    
    # Сравниваем с предыдущими
    PREV_IP_FILE="/tmp/vercel_ips_previous.txt"
    if [ -f "$PREV_IP_FILE" ]; then
        if ! diff -q "$IP_FILE" "$PREV_IP_FILE" > /dev/null; then
            log "⚠️  ИЗМЕНЕНИЕ IP ОБНАРУЖЕНО!"
            log "Старые IP: $(cat $PREV_IP_FILE | tr '\n' ' ')"
            log "Новые IP: $(cat $IP_FILE | tr '\n' ' ')"
            
            # Перезапускаем Nginx для обновления DNS
            log "🔄 Перезапускаем Nginx..."
            systemctl reload nginx
            
            # Очищаем DNS кэш
            systemd-resolve --flush-caches 2>/dev/null || true
            
            log "✅ Nginx перезапущен, DNS кэш очищен"
        fi
    fi
    
    # Сохраняем текущие IP как предыдущие
    cp "$IP_FILE" "$PREV_IP_FILE"
}

# Проверка версии деплоя
check_version() {
    log "Проверяем версию деплоя..."
    
    # Проверяем версию через API
    VERSION_DIRECT=$(curl -s "https://$VERCEL_DOMAIN/api/health" | jq -r '.buildTime // "unknown"' 2>/dev/null)
    VERSION_PROXY=$(curl -s "http://$PROXY_DOMAIN/api/health" | jq -r '.buildTime // "unknown"' 2>/dev/null)
    
    log "Версия напрямую: $VERSION_DIRECT"
    log "Версия через прокси: $VERSION_PROXY"
    
    if [ "$VERSION_DIRECT" != "$VERSION_PROXY" ] && [ "$VERSION_DIRECT" != "unknown" ] && [ "$VERSION_PROXY" != "unknown" ]; then
        log "⚠️  ВЕРСИИ НЕ СОВПАДАЮТ! Прокси показывает устаревшую версию"
        log "🔄 Принудительно очищаем кэш и перезапускаем Nginx..."
        
        # Очищаем все возможные кэши
        systemctl reload nginx
        systemd-resolve --flush-caches 2>/dev/null || true
        
        # Ждем и проверяем еще раз
        sleep 3
        VERSION_PROXY_NEW=$(curl -s "http://$PROXY_DOMAIN/api/health" | jq -r '.buildTime // "unknown"' 2>/dev/null)
        log "Версия через прокси после перезапуска: $VERSION_PROXY_NEW"
    fi
}

# Основной цикл мониторинга
while true; do
    check_ips
    check_version
    
    log "😴 Ждем 60 секунд до следующей проверки..."
    sleep 60
done 