-- Конвертируем Excel Serial Date в поле "Выявленные нарушения" (лист Работники - дата рождения)
UPDATE t_p80499285_psot_realization_pro.wr_employees
SET extra_data = jsonb_set(
  extra_data,
  '{"Выявленные нарушения"}',
  to_jsonb(to_char((DATE '1899-12-30' + (extra_data->>'Выявленные нарушения')::integer * INTERVAL '1 day'), 'DD.MM.YYYY'))
)
WHERE archived = FALSE
  AND extra_data ? 'Выявленные нарушения'
  AND extra_data->>'Выявленные нарушения' ~ '^[0-9]{4,6}$';