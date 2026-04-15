-- V0111: добавляем поле shift в contractor_records и таблицу prolongation-настроек
ALTER TABLE t_p80499285_psot_realization_pro.zdravpunkt_contractor_records
  ADD COLUMN IF NOT EXISTS shift VARCHAR(10) NOT NULL DEFAULT 'day';

-- Таблица настроек пролонгации: каждая компания-подрядчик может иметь ежедневное автозаполнение
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.zdravpunkt_contractor_prolongation (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  company_name VARCHAR(500) NOT NULL,
  workers_count_day INTEGER NOT NULL DEFAULT 0,
  workers_count_night INTEGER NOT NULL DEFAULT 0,
  admission VARCHAR(50) NOT NULL DEFAULT 'admitted',
  exam_type VARCHAR(50) NOT NULL DEFAULT 'pre_shift',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_filled_date DATE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_prolongation_org
  ON t_p80499285_psot_realization_pro.zdravpunkt_contractor_prolongation(organization_id);
