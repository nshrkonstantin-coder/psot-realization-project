-- Архивируем текущие записи Усть-Нера перед повторной загрузкой
UPDATE t_p80499285_psot_realization_pro.wr_employees
SET archived = true
WHERE sheet_name = 'Усть-Нера' AND archived = false;
