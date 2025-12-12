-- Add missing KBT report fields
ALTER TABLE t_p80499285_psot_realization_pro.kbt_reports 
ADD COLUMN IF NOT EXISTS pab_reason_department TEXT,
ADD COLUMN IF NOT EXISTS pab_reason_personal TEXT,
ADD COLUMN IF NOT EXISTS tools_condition TEXT,
ADD COLUMN IF NOT EXISTS workplaces_condition TEXT,
ADD COLUMN IF NOT EXISTS improvement_measures TEXT,
ADD COLUMN IF NOT EXISTS involved_workers_count VARCHAR(50),
ADD COLUMN IF NOT EXISTS involved_workers_list TEXT,
ADD COLUMN IF NOT EXISTS not_involved_workers_count VARCHAR(50),
ADD COLUMN IF NOT EXISTS involved_engineers_count VARCHAR(50),
ADD COLUMN IF NOT EXISTS involved_engineers_list TEXT,
ADD COLUMN IF NOT EXISTS not_involved_engineers_count VARCHAR(50),
ADD COLUMN IF NOT EXISTS involvement_work TEXT;