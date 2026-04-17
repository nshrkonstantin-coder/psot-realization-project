-- Архивируем дубли (оставляем меньший id каждой пары)
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns
SET sheet_name = '_archived_ust_nera'
WHERE id IN (421, 422, 423, 424, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435);
