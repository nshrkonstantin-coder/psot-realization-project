-- Добавляем поля для мягкого удаления (архивирования)
ALTER TABLE t_p80499285_psot_realization_pro.production_control_reports 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

ALTER TABLE t_p80499285_psot_realization_pro.production_control_reports 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Создаём индекс для быстрой фильтрации активных записей
CREATE INDEX IF NOT EXISTS idx_pc_reports_archived 
ON t_p80499285_psot_realization_pro.production_control_reports(archived) 
WHERE archived = FALSE;
