-- Конвертируем Excel Serial Date в поле Б.4.1. (дата рождения в КР+СОУТ)
UPDATE t_p80499285_psot_realization_pro.wr_employees
SET extra_data = jsonb_set(
  extra_data,
  '{"Б.4.1."}',
  to_jsonb(to_char((DATE '1899-12-30' + (extra_data->>'Б.4.1.')::integer * INTERVAL '1 day'), 'DD.MM.YYYY'))
)
WHERE archived = FALSE
  AND extra_data ? 'Б.4.1.'
  AND extra_data->>'Б.4.1.' ~ '^[0-9]{4,6}$';