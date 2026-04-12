UPDATE t_p80499285_psot_realization_pro.zdravpunkt_esmo
SET exam_result = CASE
  WHEN extra_data->>'Допуск' = 'Разрешен' THEN 'admitted'
  WHEN extra_data->>'Допуск' = 'Запрещен' THEN 'not_admitted'
  WHEN extra_data->>'Допуск' = 'Уклонился' THEN 'evaded'
  ELSE ''
END,
reject_reason = CASE
  WHEN extra_data->>'Допуск' IN ('Запрещен', 'Уклонился') THEN extra_data->>'Результат осмотра'
  ELSE ''
END
WHERE (exam_result = '' OR exam_result IS NULL)
  AND (extra_data->>'Допуск') IS NOT NULL
  AND (extra_data->>'Допуск') != '';
