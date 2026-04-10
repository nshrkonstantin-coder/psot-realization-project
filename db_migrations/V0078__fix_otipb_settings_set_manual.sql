-- Обновляем все записи с NULL на manual
UPDATE t_p80499285_psot_realization_pro.otipb_settings
SET specialist_source = 'manual'
WHERE organization_id IS NULL;
