UPDATE t_p80499285_psot_realization_pro.wr_employees
SET extra_data = jsonb_set(
  extra_data,
  '{"Образование"}',
  to_jsonb(to_char((DATE '1899-12-30' + (extra_data->>'Образование')::integer * INTERVAL '1 day'), 'DD.MM.YYYY'))
)
WHERE archived = FALSE
  AND extra_data ? 'Образование'
  AND extra_data->>'Образование' ~ '^[0-9]{4,6}$';