-- Вручную заполняем пропущенные дни пролонгации для ВГСЧ (organization_id=3)
-- 14.04.2026 — дневная смена (4 чел)
INSERT INTO t_p80499285_psot_realization_pro.zdravpunkt_contractor_records
  (organization_id, record_date, company_name, workers_count, admission, exam_type, shift)
VALUES (3, '2026-04-14', 'ВГСЧ', 4, 'admitted', 'pre_shift', 'day');

-- 14.04.2026 — ночная смена (1 чел)
INSERT INTO t_p80499285_psot_realization_pro.zdravpunkt_contractor_records
  (organization_id, record_date, company_name, workers_count, admission, exam_type, shift)
VALUES (3, '2026-04-14', 'ВГСЧ', 1, 'admitted', 'pre_shift', 'night');

-- 15.04.2026 — дневная смена (4 чел)
INSERT INTO t_p80499285_psot_realization_pro.zdravpunkt_contractor_records
  (organization_id, record_date, company_name, workers_count, admission, exam_type, shift)
VALUES (3, '2026-04-15', 'ВГСЧ', 4, 'admitted', 'pre_shift', 'day');

-- 15.04.2026 — ночная смена (1 чел)
INSERT INTO t_p80499285_psot_realization_pro.zdravpunkt_contractor_records
  (organization_id, record_date, company_name, workers_count, admission, exam_type, shift)
VALUES (3, '2026-04-15', 'ВГСЧ', 1, 'admitted', 'pre_shift', 'night');

-- Ставим last_filled_date = сегодня чтобы повторно не задвоилось
UPDATE t_p80499285_psot_realization_pro.zdravpunkt_contractor_prolongation
  SET last_filled_date = '2026-04-15'
  WHERE id = 1;
