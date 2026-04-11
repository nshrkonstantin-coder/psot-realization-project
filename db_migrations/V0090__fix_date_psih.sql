-- Конвертируем Excel Serial Date для остальных датовых полей
UPDATE t_p80499285_psot_realization_pro.wr_employees
SET extra_data = jsonb_set(
  extra_data,
  '{"псих.освидетельствование"}',
  to_jsonb(to_char((DATE '1899-12-30' + (extra_data->>'псих.освидетельствование')::integer * INTERVAL '1 day'), 'DD.MM.YYYY'))
)
WHERE archived = FALSE
  AND extra_data ? 'псих.освидетельствование'
  AND extra_data->>'псих.освидетельствование' ~ '^[0-9]{4,6}$';