CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.page_locks (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(255) NOT NULL UNIQUE,
  is_locked BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by_user_id INTEGER
);

-- Периодичность МО заблокирована по умолчанию
INSERT INTO t_p80499285_psot_realization_pro.page_locks (page_key, is_locked)
VALUES ('Периодичность МО', TRUE)
ON CONFLICT (page_key) DO NOTHING;