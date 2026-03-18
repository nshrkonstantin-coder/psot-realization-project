-- Демо-данные: ПАБ записи для демо-организации (org_id=5, user_id=87)
INSERT INTO t_p80499285_psot_realization_pro.pab_records 
  (doc_number, doc_date, inspector_fio, inspector_position, user_id, organization_id, department, location, checked_object, status)
VALUES
  ('ДЕМО-001', CURRENT_DATE - INTERVAL '5 days', 'Иванов Иван Иванович', 'Специалист по охране труда', 87, 5, 'Производственный цех №1', 'Участок резки металла', 'Рабочее место оператора', 'new'),
  ('ДЕМО-002', CURRENT_DATE - INTERVAL '10 days', 'Иванов Иван Иванович', 'Специалист по охране труда', 87, 5, 'Механический цех', 'Рабочая зона токарных станков', 'Оборудование', 'in_progress'),
  ('ДЕМО-003', CURRENT_DATE - INTERVAL '20 days', 'Иванов Иван Иванович', 'Специалист по охране труда', 87, 5, 'Склад №2', 'Складское помещение', 'Проходы и эвакуационные пути', 'closed'),
  ('ДЕМО-004', CURRENT_DATE - INTERVAL '2 days', 'Иванов Иван Иванович', 'Специалист по охране труда', 87, 5, 'Административное здание', 'Кровля', 'Работы на высоте', 'new'),
  ('ДЕМО-005', CURRENT_DATE - INTERVAL '7 days', 'Иванов Иван Иванович', 'Специалист по охране труда', 87, 5, 'Прессовый цех', 'Рабочая зона пресса', 'Гидравлический пресс ГП-200', 'in_progress');

-- Демо-данные: Производственный контроль (org_id=5, user_id=87)
INSERT INTO t_p80499285_psot_realization_pro.production_control_reports
  (doc_number, doc_date, department, issuer_name, issuer_position, issue_date, user_id, organization_id, status)
VALUES
  ('ПК-ДЕМО-001', CURRENT_DATE - INTERVAL '3 days', 'Производственный цех №1', 'Иванов Иван Иванович', 'Специалист по охране труда', CURRENT_DATE - INTERVAL '3 days', 87, 5, 'completed'),
  ('ПК-ДЕМО-002', CURRENT_DATE - INTERVAL '8 days', 'Механический цех', 'Иванов Иван Иванович', 'Специалист по охране труда', CURRENT_DATE - INTERVAL '8 days', 87, 5, 'completed'),
  ('ПК-ДЕМО-003', CURRENT_DATE - INTERVAL '15 days', 'Склад №2', 'Иванов Иван Иванович', 'Специалист по охране труда', CURRENT_DATE - INTERVAL '15 days', 87, 5, 'new');

-- Демо-данные: КБТ отчёты (org_id=5, user_id=87)
INSERT INTO t_p80499285_psot_realization_pro.kbt_reports
  (department, head_name, period_from, period_to, sick_count, violations_count, fixed_count, in_progress_count, user_id, organization_id, company)
VALUES
  ('Производственный цех №1', 'Иванов Иван Иванович', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', '2', '5', '3', '2', 87, 5, 'ДЕМО: ООО "Западная Нефтяная Компания"'),
  ('Механический цех', 'Иванов Иван Иванович', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', '0', '3', '3', '0', 87, 5, 'ДЕМО: ООО "Западная Нефтяная Компания"'),
  ('Административный отдел', 'Иванов Иван Иванович', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', '1', '1', '0', '1', 87, 5, 'ДЕМО: ООО "Западная Нефтяная Компания"');