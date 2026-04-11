-- Помечаем дубликаты как archived (оставляем только минимальный id для каждой пары fio+sheet_name)
UPDATE t_p80499285_psot_realization_pro.wr_employees
SET archived = TRUE
WHERE id NOT IN (
  SELECT MIN(id)
  FROM t_p80499285_psot_realization_pro.wr_employees
  GROUP BY fio, sheet_name
)
AND archived = FALSE;