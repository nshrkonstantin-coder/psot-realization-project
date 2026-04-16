UPDATE t_p80499285_psot_realization_pro.wr_employees e
SET extra_data = jsonb_set(
    COALESCE(extra_data, '{}'::jsonb),
    '{"№ п/п"}',
    to_jsonb(rn::text)
)
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY sheet_name ORDER BY id) as rn
    FROM t_p80499285_psot_realization_pro.wr_employees
    WHERE (archived = false OR archived IS NULL)
) numbered
WHERE e.id = numbered.id;