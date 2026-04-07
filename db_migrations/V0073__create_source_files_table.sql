CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.source_files (
    id SERIAL PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    file_content TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT 'backend',
    updated_at TIMESTAMP DEFAULT NOW()
);