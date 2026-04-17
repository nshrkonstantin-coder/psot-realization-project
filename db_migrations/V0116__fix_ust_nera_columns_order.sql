-- Удаляем все старые дубли колонок Усть-Нера (id 1-342), оставляем только свежие (343+)
-- Помечаем старые как принадлежащие другому листу чтобы не мешали
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns
SET sheet_name = '_archived_ust_nera'
WHERE sheet_name = 'Усть-Нера' AND id < 343;

-- Выставляем правильный порядок для свежих колонок
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 0 WHERE id = 343; -- № п/п
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 0 WHERE id = 421; -- № п/п (дубль — тоже архивируем)

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 1, is_core = true WHERE id = 344; -- ФИО
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 1, is_core = true WHERE id = 422; -- ФИО дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 2, is_core = true WHERE id = 345; -- Подразделение
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 2, is_core = true WHERE id = 423; -- Подразделение дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 3, is_core = true WHERE id = 346; -- Должность
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 3, is_core = true WHERE id = 424; -- Должность дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 4 WHERE id = 348; -- СНИЛС
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 4 WHERE id = 426; -- СНИЛС дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 5 WHERE id = 349; -- ИНН
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 5 WHERE id = 427; -- ИНН дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 6 WHERE id = 350; -- Дата рождения
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 6 WHERE id = 428; -- Дата рождения дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 7 WHERE id = 351; -- дата приема
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 7 WHERE id = 429; -- дата приема дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 8 WHERE id = 352; -- Моб.телефон
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 8 WHERE id = 430; -- Моб.телефон дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 9 WHERE id = 353; -- № карты риска
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 9 WHERE id = 431; -- № карты риска дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 10 WHERE id = 354; -- № карты СОУТ
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 10 WHERE id = 432; -- № карты СОУТ дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 11 WHERE id = 355; -- Медкомиссия
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 11 WHERE id = 433; -- Медкомиссия дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 12 WHERE id = 356; -- Психосвидетельствование
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 12 WHERE id = 434; -- Психосвидетельствование дубль

UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 13 WHERE id = 357; -- Выявленные нарушения
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns SET column_order = 13 WHERE id = 435; -- Выявленные нарушения дубль

-- Архивируем ненужные колонки (Должность/Подразделение, № п/п дубли)
UPDATE t_p80499285_psot_realization_pro.workers_registry_columns
SET sheet_name = '_archived_ust_nera'
WHERE sheet_name = 'Усть-Нера' AND column_key IN ('Должность/Подразделение', 'Реестр сотрудников');
