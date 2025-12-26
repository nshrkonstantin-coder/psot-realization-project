-- Миграция: Критичные индексы для производительности при 300+ пользователей

-- Индексы для users (авторизация, самый частый запрос)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON t_p80499285_psot_realization_pro.users(email);

CREATE INDEX IF NOT EXISTS idx_users_organization_id 
ON t_p80499285_psot_realization_pro.users(organization_id);

-- Индексы для organizations (код регистрации для входа)
CREATE INDEX IF NOT EXISTS idx_organizations_registration_code 
ON t_p80499285_psot_realization_pro.organizations(registration_code);

CREATE INDEX IF NOT EXISTS idx_organizations_is_active 
ON t_p80499285_psot_realization_pro.organizations(is_active);

-- Индексы для pab_records (списки актов)
CREATE INDEX IF NOT EXISTS idx_pab_records_organization_id 
ON t_p80499285_psot_realization_pro.pab_records(organization_id);

CREATE INDEX IF NOT EXISTS idx_pab_records_status 
ON t_p80499285_psot_realization_pro.pab_records(status);

-- Индексы для production_control_reports (производственный контроль)
CREATE INDEX IF NOT EXISTS idx_pc_reports_organization_id 
ON t_p80499285_psot_realization_pro.production_control_reports(organization_id);
