-- Добавляем флаг дубля
ALTER TABLE t_p80499285_psot_realization_pro.zdravpunkt_workers
ADD COLUMN IF NOT EXISTS is_duplicate boolean NOT NULL DEFAULT false;

-- Помечаем дубли: оставляем только запись с минимальным id для каждого уникального ФИО
UPDATE t_p80499285_psot_realization_pro.zdravpunkt_workers w
SET is_duplicate = true
WHERE id NOT IN (
    SELECT MIN(id)
    FROM t_p80499285_psot_realization_pro.zdravpunkt_workers
    GROUP BY TRIM(LOWER(fio))
)
AND is_duplicate = false;