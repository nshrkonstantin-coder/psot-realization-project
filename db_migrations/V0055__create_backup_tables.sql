-- Таблица для настроек резервного копирования
CREATE TABLE IF NOT EXISTS backup_config (
    id SERIAL PRIMARY KEY,
    auto_backup BOOLEAN DEFAULT FALSE,
    day_of_week VARCHAR(20) DEFAULT 'monday',
    backup_time VARCHAR(10) DEFAULT '03:00',
    last_backup TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для истории резервных копий
CREATE TABLE IF NOT EXISTS backup_history (
    id SERIAL PRIMARY KEY,
    backup_id VARCHAR(50) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT,
    size_text VARCHAR(50),
    table_count INTEGER,
    backup_date DATE NOT NULL,
    backup_time VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'success',
    download_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставляем начальную конфигурацию если её нет
INSERT INTO backup_config (auto_backup, day_of_week, backup_time)
SELECT FALSE, 'monday', '03:00'
WHERE NOT EXISTS (SELECT 1 FROM backup_config);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_backup_history_date ON backup_history(backup_date DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
