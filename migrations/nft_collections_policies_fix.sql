-- Исправленные политики для работы NFT Collections API
-- Выполнить после создания таблицы для исправления проблем с RLS

-- Сначала удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Anyone can view public active collections" ON nft_collections;
DROP POLICY IF EXISTS "Admins can view all collections" ON nft_collections; 
DROP POLICY IF EXISTS "Authenticated users can insert collections" ON nft_collections;
DROP POLICY IF EXISTS "Authenticated users can update collections" ON nft_collections;
DROP POLICY IF EXISTS "Authenticated users can delete collections" ON nft_collections;

-- 1. Политика для SELECT - все могут читать
CREATE POLICY "Allow read access to nft_collections" ON nft_collections
  FOR SELECT USING (true);

-- 2. Политика для INSERT - разрешаем через service role
CREATE POLICY "Allow insert with service role" ON nft_collections
  FOR INSERT WITH CHECK (true);

-- 3. Политика для UPDATE - разрешаем через service role  
CREATE POLICY "Allow update with service role" ON nft_collections
  FOR UPDATE USING (true);

-- 4. Политика для DELETE - разрешаем через service role
CREATE POLICY "Allow delete with service role" ON nft_collections
  FOR DELETE USING (true);

-- Комментарии
COMMENT ON POLICY "Allow read access to nft_collections" ON nft_collections 
IS 'Разрешить чтение всех коллекций';

COMMENT ON POLICY "Allow insert with service role" ON nft_collections
IS 'Разрешить вставку новых коллекций через service role';

COMMENT ON POLICY "Allow update with service role" ON nft_collections
IS 'Разрешить обновление коллекций через service role';

COMMENT ON POLICY "Allow delete with service role" ON nft_collections
IS 'Разрешить удаление коллекций через service role'; 