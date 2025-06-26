-- Создание таблицы для хранения операций минтинга NFT
-- Таблица mint_operations для персистентного хранения истории минтинга

CREATE TABLE IF NOT EXISTS mint_operations (
    id BIGSERIAL PRIMARY KEY,
    operation_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'single', -- 'single' или 'batch'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    -- Данные коллекции
    collection_id VARCHAR(255),
    collection_name VARCHAR(255),
    
    -- Получатель NFT
    recipient VARCHAR(255),
    
    -- Метаданные NFT (JSON)
    metadata JSONB,
    
    -- Для batch операций
    total_items INTEGER DEFAULT 1,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Результат операции (JSON)
    result JSONB,
    
    -- Ошибки
    error_message TEXT,
    
    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Дополнительные поля
    cost DECIMAL(10, 8) DEFAULT 0.00025, -- Стоимость в SOL
    confirmations INTEGER DEFAULT 0,
    transaction_hash VARCHAR(255),
    leaf_index INTEGER
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_mint_operations_operation_id ON mint_operations(operation_id);
CREATE INDEX IF NOT EXISTS idx_mint_operations_status ON mint_operations(status);
CREATE INDEX IF NOT EXISTS idx_mint_operations_type ON mint_operations(type);
CREATE INDEX IF NOT EXISTS idx_mint_operations_collection_id ON mint_operations(collection_id);
CREATE INDEX IF NOT EXISTS idx_mint_operations_created_at ON mint_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mint_operations_completed_at ON mint_operations(completed_at DESC);

-- Индекс для поиска по recipient
CREATE INDEX IF NOT EXISTS idx_mint_operations_recipient ON mint_operations(recipient);

-- Составной индекс для частых запросов
CREATE INDEX IF NOT EXISTS idx_mint_operations_status_type_created ON mint_operations(status, type, created_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_mint_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_mint_operations_updated_at ON mint_operations;
CREATE TRIGGER trigger_mint_operations_updated_at
    BEFORE UPDATE ON mint_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_mint_operations_updated_at();

-- Создание таблицы для статистики коллекций (если не существует)
CREATE TABLE IF NOT EXISTS collection_stats (
    id BIGSERIAL PRIMARY KEY,
    collection_id VARCHAR(255) UNIQUE NOT NULL,
    total_minted INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    last_mint_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для collection_stats
CREATE INDEX IF NOT EXISTS idx_collection_stats_collection_id ON collection_stats(collection_id);

-- Триггер для обновления updated_at в collection_stats
CREATE OR REPLACE FUNCTION update_collection_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_collection_stats_updated_at ON collection_stats;
CREATE TRIGGER trigger_collection_stats_updated_at
    BEFORE UPDATE ON collection_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_stats_updated_at();

-- Представление для удобного просмотра статистики
CREATE OR REPLACE VIEW mint_operations_summary AS
SELECT 
    DATE(created_at) as mint_date,
    status,
    type,
    collection_name,
    COUNT(*) as operations_count,
    SUM(total_items) as total_nfts,
    SUM(successful_items) as successful_nfts,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_operations,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_operations,
    AVG(cost) as avg_cost
FROM mint_operations 
GROUP BY DATE(created_at), status, type, collection_name
ORDER BY mint_date DESC, collection_name;

-- Комментарии к таблице
COMMENT ON TABLE mint_operations IS 'Хранение истории операций минтинга NFT';
COMMENT ON COLUMN mint_operations.operation_id IS 'Уникальный идентификатор операции (UUID)';
COMMENT ON COLUMN mint_operations.type IS 'Тип операции: single или batch';
COMMENT ON COLUMN mint_operations.status IS 'Статус: pending, processing, completed, failed';
COMMENT ON COLUMN mint_operations.metadata IS 'JSON метаданные NFT';
COMMENT ON COLUMN mint_operations.result IS 'JSON результат операции минтинга';

-- Создание RLS политик (опционально, для безопасности)
-- ALTER TABLE mint_operations ENABLE ROW LEVEL SECURITY;

-- Базовая политика для чтения (можно настроить по необходимости)
-- CREATE POLICY "Allow read access to mint_operations" ON mint_operations 
--     FOR SELECT USING (true);

-- Политика для вставки (можно ограничить по ролям)
-- CREATE POLICY "Allow insert to mint_operations" ON mint_operations 
--     FOR INSERT WITH CHECK (true);

-- Политика для обновления (можно ограничить по ролям) 
-- CREATE POLICY "Allow update to mint_operations" ON mint_operations 
--     FOR UPDATE USING (true);

-- Успешное создание таблицы
SELECT 'Таблица mint_operations успешно создана!' as status; 