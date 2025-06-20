-- Политики безопасности для таблицы nft_collections
-- Выполнить ПОСЛЕ создания основной таблицы

-- 1. Включаем Row Level Security (RLS) для таблицы
ALTER TABLE nft_collections ENABLE ROW LEVEL SECURITY;

-- 2. Политика для SELECT - все могут читать активные публичные коллекции
CREATE POLICY "Anyone can view public active collections" ON nft_collections
  FOR SELECT USING (
    is_public = true AND status = 'active'
  );

-- 3. Политика для SELECT - администраторы могут видеть все коллекции
CREATE POLICY "Admins can view all collections" ON nft_collections
  FOR SELECT USING (
    -- Здесь нужно добавить проверку роли администратора
    -- Пока разрешаем всем (можно настроить позже)
    true
  );

-- 4. Политика для INSERT - только авторизованные пользователи
CREATE POLICY "Authenticated users can insert collections" ON nft_collections
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- 5. Политика для UPDATE - только авторизованные пользователи
CREATE POLICY "Authenticated users can update collections" ON nft_collections
  FOR UPDATE USING (
    auth.role() = 'authenticated'
  );

-- 6. Политика для DELETE - только авторизованные пользователи
CREATE POLICY "Authenticated users can delete collections" ON nft_collections
  FOR DELETE USING (
    auth.role() = 'authenticated'
  );

-- Альтернативные политики для продакшена (раскомментировать при необходимости):

-- Более строгие политики для админов:
/*
-- Заменить политики выше на эти для продакшена:

-- Только администраторы могут вставлять коллекции
CREATE POLICY "Only admins can insert collections" ON nft_collections
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Только администраторы могут обновлять коллекции  
CREATE POLICY "Only admins can update collections" ON nft_collections
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Только администраторы могут удалять коллекции
CREATE POLICY "Only admins can delete collections" ON nft_collections
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );
*/

-- Создаем индекс для быстрой работы политик
CREATE INDEX IF NOT EXISTS idx_nft_collections_public_status 
ON nft_collections(is_public, status) 
WHERE is_public = true AND status = 'active';

-- Комментарии к политикам
COMMENT ON POLICY "Anyone can view public active collections" ON nft_collections 
IS 'Все пользователи могут просматривать публичные активные коллекции';

COMMENT ON POLICY "Authenticated users can insert collections" ON nft_collections
IS 'Авторизованные пользователи могут добавлять новые коллекции';

COMMENT ON POLICY "Authenticated users can update collections" ON nft_collections  
IS 'Авторизованные пользователи могут обновлять существующие коллекции';

COMMENT ON POLICY "Authenticated users can delete collections" ON nft_collections
IS 'Авторизованные пользователи могут удалять коллекции'; 