INSERT INTO t_p80499285_psot_realization_pro.users
(email, password_hash, fio, display_name, company, subdivision, position, role, organization_id)
SELECT v.email, 'demo-no-login', v.fio, v.fio, 'ДЕМО: ООО "Западная Нефтяная Компания"', v.sub, v.pos, 'user', 5
FROM (VALUES
 ('s.petrov@wnk-demo.example','Петров Сергей Николаевич','Прессовый цех','Начальник участка'),
 ('a.sidorova@wnk-demo.example','Сидорова Анна Павловна','Отдел охраны труда','Инженер по охране труда'),
 ('d.kuznetsov@wnk-demo.example','Кузнецов Дмитрий Олегович','Механический цех','Мастер смены'),
 ('e.morozova@wnk-demo.example','Морозова Елена Игоревна','Отдел охраны труда','Специалист по пожарной безопасности'),
 ('a.smirnov@wnk-demo.example','Смирнов Алексей Викторович','Склад №2','Начальник склада'),
 ('p.orlov@wnk-demo.example','Орлов Павел Андреевич','Участок сборки','Бригадир')
) AS v(email, fio, sub, pos)
WHERE NOT EXISTS (SELECT 1 FROM t_p80499285_psot_realization_pro.users u WHERE u.email = v.email);

UPDATE t_p80499285_psot_realization_pro.users
SET display_name = fio
WHERE id = 87 AND (display_name IS NULL OR display_name = '');

UPDATE t_p80499285_psot_realization_pro.pab_records
SET inspector_fio = CASE id
  WHEN 86 THEN 'Петров Сергей Николаевич'
  WHEN 87 THEN 'Сидорова Анна Павловна'
  WHEN 88 THEN 'Кузнецов Дмитрий Олегович'
  WHEN 89 THEN 'Морозова Елена Игоревна'
  WHEN 90 THEN 'Смирнов Алексей Викторович'
  ELSE inspector_fio END,
  inspector_position = CASE id
  WHEN 86 THEN 'Начальник участка'
  WHEN 87 THEN 'Инженер по охране труда'
  WHEN 88 THEN 'Мастер смены'
  WHEN 89 THEN 'Специалист по пожарной безопасности'
  WHEN 90 THEN 'Начальник склада'
  ELSE inspector_position END
WHERE id BETWEEN 86 AND 90 AND organization_id = 5;

UPDATE t_p80499285_psot_realization_pro.production_control_reports
SET recipient_name = 'Демо Пользователь'
WHERE id BETWEEN 31 AND 33 AND organization_id = 5 AND recipient_name IS NULL;
