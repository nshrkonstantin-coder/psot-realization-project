INSERT INTO t_p80499285_psot_realization_pro.ot_orders
(title, issued_date, deadline, extended_deadline, responsible_person, issued_by, status, organization_id, assigned_to_user_id, created_by_user_id, notes)
SELECT v.title, CURRENT_DATE + v.issued, CURRENT_DATE + v.dl, CASE WHEN v.ext IS NULL THEN NULL ELSE CURRENT_DATE + v.ext END,
       v.resp, 'Иванов Иван Иванович', v.st, 5, 87, 87, v.notes
FROM (VALUES
 ('Провести внеплановый инструктаж по работе на высоте', -12, -4, NULL::int, 'Демо Пользователь', 'new', 'Охват: все работники участка №2'),
 ('Актуализировать схемы эвакуации во всех цехах', -10, 9, NULL::int, 'Петров Сергей Николаевич', 'new', 'Согласовать с пожарной службой'),
 ('Обеспечить работников зимней спецодеждой и СИЗ', -20, -8, NULL::int, 'Сидорова Анна Павловна', 'completed', 'Выдача подтверждена ведомостью'),
 ('Организовать проверку знаний по охране труда у новых сотрудников', -15, -2, 12, 'Демо Пользователь', 'extended', 'Срок продлён из-за отпусков'),
 ('Заменить огнетушители с истёкшим сроком поверки', -6, 5, NULL::int, 'Кузнецов Дмитрий Олегович', 'new', NULL),
 ('Подготовить отчёт по несчастным случаям за квартал', -9, 14, NULL::int, 'Демо Пользователь', 'new', 'Форма отчёта согласована'),
 ('Провести обучение по оказанию первой помощи', -30, -15, NULL::int, 'Морозова Елена Игоревна', 'completed', 'Обучено 24 человека'),
 ('Обновить маркировку ёмкостей с химическими веществами', -4, 3, NULL::int, 'Петров Сергей Николаевич', 'new', NULL)
) AS v(title, issued, dl, ext, resp, st, notes)
WHERE NOT EXISTS (SELECT 1 FROM t_p80499285_psot_realization_pro.ot_orders WHERE organization_id = 5);
