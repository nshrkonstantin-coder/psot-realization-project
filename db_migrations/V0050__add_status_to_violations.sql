ALTER TABLE t_p80499285_psot_realization_pro.production_control_violations 
ADD COLUMN status VARCHAR(50) DEFAULT 'new';

COMMENT ON COLUMN t_p80499285_psot_realization_pro.production_control_violations.status 
IS 'Статус нарушения: new, in_progress, eliminated';