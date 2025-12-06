-- Таблица для записей ПАБ
CREATE TABLE IF NOT EXISTS pab_records (
    id SERIAL PRIMARY KEY,
    doc_number VARCHAR(100) NOT NULL,
    doc_date DATE NOT NULL,
    inspector_fio VARCHAR(255) NOT NULL,
    inspector_position VARCHAR(255) NOT NULL,
    user_id INTEGER,
    department VARCHAR(255),
    location VARCHAR(255),
    checked_object VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для наблюдений ПАБ
CREATE TABLE IF NOT EXISTS pab_observations (
    id SERIAL PRIMARY KEY,
    pab_record_id INTEGER NOT NULL,
    observation_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(255),
    conditions_actions VARCHAR(255),
    hazard_factors VARCHAR(255),
    measures TEXT NOT NULL,
    responsible_person VARCHAR(255),
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pab_record FOREIGN KEY (pab_record_id) REFERENCES pab_records(id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_pab_records_user_id ON pab_records(user_id);
CREATE INDEX IF NOT EXISTS idx_pab_records_doc_date ON pab_records(doc_date);
CREATE INDEX IF NOT EXISTS idx_pab_observations_pab_record_id ON pab_observations(pab_record_id);