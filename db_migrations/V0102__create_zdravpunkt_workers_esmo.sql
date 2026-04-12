CREATE TABLE t_p80499285_psot_realization_pro.zdravpunkt_workers (
  id SERIAL PRIMARY KEY,
  file_id INTEGER,
  organization_id INTEGER,
  worker_number VARCHAR(100),
  fio VARCHAR(500) NOT NULL,
  subdivision VARCHAR(500),
  position VARCHAR(500),
  company VARCHAR(500),
  extra_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p80499285_psot_realization_pro.zdravpunkt_esmo (
  id SERIAL PRIMARY KEY,
  file_id INTEGER,
  organization_id INTEGER,
  fio VARCHAR(500) NOT NULL,
  worker_number VARCHAR(100),
  subdivision VARCHAR(500),
  position VARCHAR(500),
  company VARCHAR(500),
  exam_date DATE,
  exam_result VARCHAR(50),
  reject_reason TEXT,
  extra_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_zp_workers_fio ON t_p80499285_psot_realization_pro.zdravpunkt_workers(fio);
CREATE INDEX idx_zp_workers_org ON t_p80499285_psot_realization_pro.zdravpunkt_workers(organization_id);
CREATE INDEX idx_zp_esmo_fio ON t_p80499285_psot_realization_pro.zdravpunkt_esmo(fio);
CREATE INDEX idx_zp_esmo_org ON t_p80499285_psot_realization_pro.zdravpunkt_esmo(organization_id);
CREATE INDEX idx_zp_esmo_date ON t_p80499285_psot_realization_pro.zdravpunkt_esmo(exam_date);
