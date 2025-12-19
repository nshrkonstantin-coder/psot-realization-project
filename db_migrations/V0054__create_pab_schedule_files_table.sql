-- Таблица для хранения загруженных Excel-файлов с графиками ПАБ
CREATE TABLE IF NOT EXISTS pab_schedule_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(500) NOT NULL,
    file_data JSONB NOT NULL,
    uploaded_by INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    organization_id INTEGER
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_pab_schedule_files_active ON pab_schedule_files(is_active);
CREATE INDEX IF NOT EXISTS idx_pab_schedule_files_org ON pab_schedule_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_pab_schedule_files_uploaded_at ON pab_schedule_files(uploaded_at DESC);

COMMENT ON TABLE pab_schedule_files IS 'Загруженные Excel-файлы с графиками ПАБ для всех пользователей';
COMMENT ON COLUMN pab_schedule_files.file_data IS 'JSONB структура: {sheetNames: [], sheetsData: {sheetName: [{id, position, audits, observations}]}}';
