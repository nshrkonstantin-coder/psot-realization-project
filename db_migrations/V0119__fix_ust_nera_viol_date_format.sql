-- Исправляем формат дат "Выявленные нарушения" из JS Date string в dd.MM.yyyy
UPDATE t_p80499285_psot_realization_pro.wr_employees
SET extra_data = extra_data || jsonb_build_object(
  'Выявленные нарушения',
  CASE
    WHEN extra_data->>'Выявленные нарушения' ~ '^\d{2}\.\d{2}\.\d{4}$' THEN extra_data->>'Выявленные нарушения'
    WHEN extra_data->>'Выявленные нарушения' ~ '[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2} \d{4}' THEN
      to_char(
        to_date(
          regexp_replace(extra_data->>'Выявленные нарушения', '^[A-Za-z]+ ([A-Za-z]+) (\d+) (\d{4}).*', '\1 \2 \3'),
          'Mon DD YYYY'
        ),
        'DD.MM.YYYY'
      )
    ELSE extra_data->>'Выявленные нарушения'
  END
)
WHERE sheet_name = 'Усть-Нера' AND archived = false
  AND extra_data->>'Выявленные нарушения' IS NOT NULL
  AND extra_data->>'Выявленные нарушения' != ''
  AND extra_data->>'Выявленные нарушения' !~ '^\d{2}\.\d{2}\.\d{4}$';
