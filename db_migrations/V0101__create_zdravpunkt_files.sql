CREATE TABLE t_p80499285_psot_realization_pro.zdravpunkt_files (
  id SERIAL PRIMARY KEY,
  file_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  rows_count INTEGER DEFAULT 0,
  organization_id INTEGER,
  uploaded_by INTEGER,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  archived_by INTEGER,
  archived_at TIMESTAMP
);
