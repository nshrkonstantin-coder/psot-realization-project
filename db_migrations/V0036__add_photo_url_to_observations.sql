-- Добавление колонки photo_url в таблицу pab_observations для хранения ссылок на фото наблюдений
ALTER TABLE pab_observations ADD COLUMN IF NOT EXISTS photo_url TEXT;