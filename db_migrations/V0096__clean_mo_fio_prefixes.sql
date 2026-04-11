-- Очищаем fio от "1.      " префиксов в листе Периодичность МО
UPDATE t_p80499285_psot_realization_pro.wr_employees
SET fio = TRIM(REGEXP_REPLACE(fio, '^\d+\.\s+', ''))
WHERE sheet_name = 'Периодичность МО' AND archived = FALSE;