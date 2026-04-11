CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.excel_mail_datasets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    organization_id INTEGER,
    name TEXT NOT NULL DEFAULT 'Без названия',
    headers JSONB NOT NULL DEFAULT '[]',
    rows JSONB NOT NULL DEFAULT '[]',
    row_states JSONB NOT NULL DEFAULT '[]',
    file_name TEXT,
    sender_name TEXT DEFAULT 'АСУБТ',
    subject TEXT DEFAULT 'Информационное сообщение',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);