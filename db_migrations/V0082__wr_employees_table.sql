CREATE TABLE wr_employees (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER,
  worker_number VARCHAR(50),
  qr_token VARCHAR(100),
  qr_redirect_url TEXT,
  fio VARCHAR(500),
  subdivision VARCHAR(500),
  position_name VARCHAR(500),
  extra_data JSONB,
  source_file_id INTEGER,
  created_by_user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);