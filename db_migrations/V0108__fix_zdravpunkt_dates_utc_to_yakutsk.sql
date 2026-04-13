-- Исправляем exam_date и Дата/время с UTC на якутское время (+9)
-- Обновляем только записи где Дата/время оканчивается на Z (UTC формат)
UPDATE t_p80499285_psot_realization_pro.zdravpunkt_esmo
SET
  exam_date = ((extra_data->>'Дата/время')::timestamptz + interval '9 hours')::date,
  extra_data = jsonb_set(
    extra_data,
    '{"Дата/время"}',
    to_jsonb(to_char(((extra_data->>'Дата/время')::timestamptz + interval '9 hours'), 'YYYY-MM-DD"T"HH24:MI:SS'))
  )
WHERE extra_data->>'Дата/время' IS NOT NULL
  AND extra_data->>'Дата/время' LIKE '%Z';