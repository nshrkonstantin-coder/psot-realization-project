UPDATE t_p80499285_psot_realization_pro.wr_employees w
SET worker_number = 'WR-' || LPAD(rn::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM t_p80499285_psot_realization_pro.wr_employees
  WHERE archived = FALSE
) ranked
WHERE w.id = ranked.id;