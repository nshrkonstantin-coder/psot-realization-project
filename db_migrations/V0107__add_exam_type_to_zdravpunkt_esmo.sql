ALTER TABLE t_p80499285_psot_realization_pro.zdravpunkt_esmo
ADD COLUMN IF NOT EXISTS exam_type character varying(50) NULL;

COMMENT ON COLUMN t_p80499285_psot_realization_pro.zdravpunkt_esmo.exam_type IS 'Тип осмотра: pre_shift, post_shift, pre_trip, post_trip, general';

CREATE INDEX IF NOT EXISTS idx_zdravpunkt_esmo_exam_type ON t_p80499285_psot_realization_pro.zdravpunkt_esmo(exam_type);
CREATE INDEX IF NOT EXISTS idx_zdravpunkt_esmo_org_type ON t_p80499285_psot_realization_pro.zdravpunkt_esmo(organization_id, exam_type);