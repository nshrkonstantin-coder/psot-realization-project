ALTER TABLE t_p80499285_psot_realization_pro.production_control_reports 
ADD COLUMN status VARCHAR(50) DEFAULT 'new';

COMMENT ON COLUMN t_p80499285_psot_realization_pro.production_control_reports.status 
IS 'Статус записи ПК: new, in_progress, completed';