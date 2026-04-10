-- Настройки отдела ОТиПБ (источник специалистов, прочие параметры)
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.otipb_settings (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES t_p80499285_psot_realization_pro.organizations(id),
  specialist_source VARCHAR(50) NOT NULL DEFAULT 'asubt',
  -- 'asubt' = брать из базы АСУБТ (users с subdivision = ОТиПБ)
  -- 'manual' = брать из ручного списка otipb_specialists
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Ручной список специалистов ОТиПБ (заполняется суперадмином)
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.otipb_specialists (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES t_p80499285_psot_realization_pro.organizations(id),
  fio VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  user_id INTEGER REFERENCES t_p80499285_psot_realization_pro.users(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);