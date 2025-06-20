-- Создание таблицы для NFT коллекций
CREATE TABLE IF NOT EXISTS nft_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Основная информация о коллекции
  name VARCHAR(255) NOT NULL,
  description TEXT,
  symbol VARCHAR(20) DEFAULT 'cNFT',
  
  -- Адреса и идентификаторы
  tree_address VARCHAR(44) NOT NULL UNIQUE, -- Merkle Tree адрес (Solana base58)
  collection_address VARCHAR(44), -- Collection NFT адрес (если есть)
  creator_address VARCHAR(44), -- Адрес создателя
  
  -- Параметры дерева
  capacity INTEGER NOT NULL DEFAULT 1024, -- Максимальная вместимость дерева
  minted INTEGER NOT NULL DEFAULT 0, -- Количество заминченных NFT
  depth INTEGER DEFAULT 20, -- Глубина дерева Меркл
  buffer_size INTEGER DEFAULT 64, -- Размер буфера для батчей
  
  -- Метаданные и изображение
  image_url TEXT, -- URL основного изображения коллекции
  external_url TEXT, -- Внешняя ссылка на коллекцию
  metadata_json JSONB, -- Дополнительные метаданные
  
  -- Технические параметры
  has_valid_tree BOOLEAN NOT NULL DEFAULT false, -- Валидность дерева
  supports_das BOOLEAN NOT NULL DEFAULT false, -- Поддержка DAS API
  rpc_used VARCHAR(255), -- Какой RPC использовался для получения данных
  
  -- Статус и права доступа
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed'
  is_public BOOLEAN NOT NULL DEFAULT true, -- Публичная ли коллекция
  allow_minting BOOLEAN NOT NULL DEFAULT true, -- Разрешен ли минтинг
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Когда была импортирована
  last_sync_at TIMESTAMPTZ -- Последняя синхронизация с блокчейном
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_nft_collections_tree_address ON nft_collections(tree_address);
CREATE INDEX IF NOT EXISTS idx_nft_collections_status ON nft_collections(status);
CREATE INDEX IF NOT EXISTS idx_nft_collections_creator ON nft_collections(creator_address);
CREATE INDEX IF NOT EXISTS idx_nft_collections_created_at ON nft_collections(created_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_nft_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_nft_collections_updated_at
  BEFORE UPDATE ON nft_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_nft_collections_updated_at();

-- Комментарии к таблице
COMMENT ON TABLE nft_collections IS 'Таблица для хранения информации о Compressed NFT коллекциях';
COMMENT ON COLUMN nft_collections.tree_address IS 'Адрес Merkle Tree в блокчейне Solana (base58, 44 символа)';
COMMENT ON COLUMN nft_collections.capacity IS 'Максимальная вместимость дерева (обычно степень двойки)';
COMMENT ON COLUMN nft_collections.minted IS 'Текущее количество заминченных NFT в коллекции';
COMMENT ON COLUMN nft_collections.has_valid_tree IS 'Проверена ли валидность дерева через RPC';
COMMENT ON COLUMN nft_collections.supports_das IS 'Поддерживает ли RPC DAS API для этой коллекции'; 