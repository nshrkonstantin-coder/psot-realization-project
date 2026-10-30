WITH recs AS (
  INSERT INTO t_p80499285_psot_realization_pro.pab_records
  (doc_number, doc_date, inspector_fio, inspector_position, user_id, department, location, checked_object, status, organization_id)
  SELECT 'ДЕМО-' || lpad((5 + g)::text, 3, '0'),
         CURRENT_DATE - (g * 11),
         (ARRAY['Петров Сергей Николаевич','Сидорова Анна Павловна','Кузнецов Дмитрий Олегович','Морозова Елена Игоревна','Смирнов Алексей Викторович'])[1 + g % 5],
         (ARRAY['Начальник участка','Инженер по охране труда','Мастер смены','Специалист по пожарной безопасности','Начальник склада'])[1 + g % 5],
         87,
         (ARRAY['Прессовый цех','Механический цех','Склад №2','Производственный цех №1','Административное здание'])[1 + (g * 2) % 5],
         'Участок ' || (1 + g % 4),
         'Рабочее место',
         'new',
         5
  FROM generate_series(1, 16) g
  WHERE NOT EXISTS (SELECT 1 FROM t_p80499285_psot_realization_pro.pab_records WHERE doc_number = 'ДЕМО-006')
  RETURNING id, doc_date
)
INSERT INTO t_p80499285_psot_realization_pro.pab_observations
(pab_record_id, observation_number, description, category, conditions_actions, hazard_factors, measures, responsible_person, deadline, status)
SELECT r.id, k,
       (ARRAY['Не используются средства индивидуальной защиты','Загромождён проход','Неисправен электроинструмент','Отсутствует маркировка','Нарушен порядок хранения материалов'])[1 + (r.id + k) % 5],
       'Безопасность на рабочем месте (БМ)',
       'Опасное условие (ОУ)',
       'Механические опасности',
       'Устранить замечание, провести инструктаж',
       'Демо Пользователь',
       r.doc_date + (7 + ((r.id * k) % 20)),
       CASE
         WHEN r.doc_date < CURRENT_DATE - 40 THEN CASE WHEN (r.id + k) % 7 = 0 THEN 'in_progress' ELSE 'completed' END
         ELSE (ARRAY['completed','completed','in_progress','new'])[1 + (r.id + k) % 4]
       END
FROM recs r CROSS JOIN generate_series(1, 3) k;

WITH reps AS (
  INSERT INTO t_p80499285_psot_realization_pro.production_control_reports
  (doc_number, doc_date, recipient_name, department, issuer_name, issuer_position, issue_date, user_id, organization_id, status, archived)
  SELECT 'ПК-ДЕМО-' || lpad((3 + g)::text, 3, '0'),
         CURRENT_DATE - (g * 14),
         'Демо Пользователь',
         (ARRAY['Механический цех','Склад №2','Прессовый цех','Производственный цех №1','Административное здание'])[1 + (g * 3) % 5],
         (ARRAY['Сидорова Анна Павловна','Морозова Елена Игоревна','Петров Сергей Николаевич'])[1 + g % 3],
         'Инженер по охране труда',
         CURRENT_DATE - (g * 14),
         87,
         5,
         'new',
         FALSE
  FROM generate_series(1, 10) g
  WHERE NOT EXISTS (SELECT 1 FROM t_p80499285_psot_realization_pro.production_control_reports WHERE doc_number = 'ПК-ДЕМО-004')
  RETURNING id, doc_date
)
INSERT INTO t_p80499285_psot_realization_pro.production_control_violations
(report_id, item_number, description, measures, responsible_user_id, deadline, status)
SELECT r.id, k,
       (ARRAY['Просрочена поверка оборудования','Нет ограждения опасной зоны','Нарушены правила хранения','Отсутствует журнал инструктажей','Неисправно освещение'])[1 + (r.id + k) % 5],
       'Устранить нарушение в установленный срок',
       87,
       r.doc_date + (10 + ((r.id * k) % 15)),
       CASE
         WHEN r.doc_date < CURRENT_DATE - 45 THEN CASE WHEN (r.id + k) % 6 = 0 THEN 'in_progress' ELSE 'completed' END
         ELSE (ARRAY['completed','in_progress','new','completed'])[1 + (r.id + k) % 4]
       END
FROM reps r CROSS JOIN generate_series(1, 2) k;
