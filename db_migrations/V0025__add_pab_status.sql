-- Добавление статуса в таблицу pab_records
ALTER TABLE pab_records 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';

-- Добавление комментария для статусов
COMMENT ON COLUMN pab_records.status IS 'Статус ПАБ: new, completed, overdue';