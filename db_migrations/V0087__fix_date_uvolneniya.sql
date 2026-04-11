-- Конвертируем Excel Serial Date в формат DD.MM.YYYY для поля "дата увольнения"
UPDATE t_p80499285_psot_realization_pro.wr_employees
SET extra_data = jsonb_set(
  extra_data,
  '{"дата увольнения"}',
  to_jsonb(to_char((DATE '1899-12-30' + (extra_data->>'дата увольнения')::integer * INTERVAL '1 day'), 'DD.MM.YYYY'))
)
WHERE archived = FALSE
  AND extra_data ? 'дата увольнения'
  AND extra_data->>'дата увольнения' ~ '^[0-9]{4,6}$';