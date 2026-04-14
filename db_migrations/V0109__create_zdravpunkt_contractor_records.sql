CREATE TABLE t_p80499285_psot_realization_pro.zdravpunkt_contractor_records (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  record_date DATE NOT NULL,
  company_name VARCHAR(500) NOT NULL,
  workers_count INTEGER NOT NULL DEFAULT 0,
  admission VARCHAR(50) NOT NULL DEFAULT 'admitted',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);