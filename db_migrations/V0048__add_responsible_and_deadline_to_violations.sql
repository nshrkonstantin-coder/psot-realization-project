-- Add responsible_user_id and deadline to production_control_violations
ALTER TABLE t_p80499285_psot_realization_pro.production_control_violations
ADD COLUMN responsible_user_id INTEGER,
ADD COLUMN deadline DATE;