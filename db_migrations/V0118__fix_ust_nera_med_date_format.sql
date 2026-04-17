-- Исправляем формат дат Медкомиссия из JS Date string в dd.MM.yyyy
-- Используем regexp чтобы извлечь дату из строки вида "Tue Oct 21 2025 23:59:29 GMT+1000 ..."
UPDATE t_p80499285_psot_realization_pro.wr_employees
SET extra_data = extra_data || jsonb_build_object(
  'Медкомиссия',
  CASE
    WHEN extra_data->>'Медкомиссия' ~ '^\d{2}\.\d{2}\.\d{4}$' THEN extra_data->>'Медкомиссия'
    WHEN extra_data->>'Медкомиссия' ~ '[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2} \d{4}' THEN
      to_char(
        to_date(
          regexp_replace(extra_data->>'Медкомиссия', '^[A-Za-z]+ ([A-Za-z]+) (\d+) (\d{4}).*', '\1 \2 \3'),
          'Mon DD YYYY'
        ),
        'DD.MM.YYYY'
      )
    ELSE extra_data->>'Медкомиссия'
  END
)
WHERE sheet_name = 'Усть-Нера' AND archived = false
  AND extra_data->>'Медкомиссия' IS NOT NULL
  AND extra_data->>'Медкомиссия' != ''
  AND extra_data->>'Медкомиссия' !~ '^\d{2}\.\d{2}\.\d{4}$';
