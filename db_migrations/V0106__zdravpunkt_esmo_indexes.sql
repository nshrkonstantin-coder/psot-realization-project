-- Индексы для ускорения отчётов Здравпункта
CREATE INDEX IF NOT EXISTS idx_esmo_exam_result ON t_p80499285_psot_realization_pro.zdravpunkt_esmo (exam_result);
CREATE INDEX IF NOT EXISTS idx_esmo_exam_date ON t_p80499285_psot_realization_pro.zdravpunkt_esmo (exam_date);
CREATE INDEX IF NOT EXISTS idx_esmo_fio ON t_p80499285_psot_realization_pro.zdravpunkt_esmo (fio);
CREATE INDEX IF NOT EXISTS idx_esmo_subdivision ON t_p80499285_psot_realization_pro.zdravpunkt_esmo (subdivision);
CREATE INDEX IF NOT EXISTS idx_esmo_company ON t_p80499285_psot_realization_pro.zdravpunkt_esmo (company);
CREATE INDEX IF NOT EXISTS idx_esmo_result_date ON t_p80499285_psot_realization_pro.zdravpunkt_esmo (exam_result, exam_date);
