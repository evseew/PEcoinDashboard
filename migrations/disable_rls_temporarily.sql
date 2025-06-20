-- ВРЕМЕННОЕ РЕШЕНИЕ: отключить RLS для таблицы nft_collections
-- Использовать только для разработки/тестирования!
-- В продакшене настройте SUPABASE_SERVICE_ROLE_KEY и включите RLS обратно

-- Отключаем RLS для таблицы nft_collections
ALTER TABLE nft_collections DISABLE ROW LEVEL SECURITY;

-- Если хотите включить RLS обратно, выполните:
-- ALTER TABLE nft_collections ENABLE ROW LEVEL SECURITY; 