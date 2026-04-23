ALTER TABLE t_p80499285_psot_realization_pro.organizations
ADD COLUMN IF NOT EXISTS external_db_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS external_db_schema TEXT DEFAULT NULL;

COMMENT ON COLUMN t_p80499285_psot_realization_pro.organizations.external_db_url IS 'DSN внешней PostgreSQL БД организации. Если заполнено — данные организации хранятся на их ресурсах';
COMMENT ON COLUMN t_p80499285_psot_realization_pro.organizations.external_db_schema IS 'Схема во внешней БД организации';