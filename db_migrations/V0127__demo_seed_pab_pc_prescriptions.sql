INSERT INTO t_p80499285_psot_realization_pro.pab_observations
(pab_record_id, observation_number, description, category, conditions_actions, hazard_factors, measures, responsible_person, deadline, status)
SELECT r.id, o.n, o.descr, o.cat, o.cond, o.haz, o.meas, 'Демо Пользователь', CURRENT_DATE + o.dl, o.st
FROM t_p80499285_psot_realization_pro.pab_records r
JOIN (VALUES
 (86,1,'Загромождён проход к эвакуационному выходу ящиками','Порядок на рабочем месте (ПМ)','Опасное условие (ОУ)','Механические опасности','Освободить проход, обозначить зону разметкой',5,'new'),
 (86,2,'Работник выполняет работы без защитных очков','Безопасность на рабочем месте (БМ)','Опасное действие (ОД)','Механические опасности','Провести инструктаж, выдать СИЗ',3,'new'),
 (87,1,'Повреждена изоляция удлинителя на участке сборки','Безопасность на рабочем месте (БМ)','Опасное условие (ОУ)','Электрические опасности','Заменить удлинитель, проверить сеть',-2,'in_progress'),
 (87,2,'Отсутствует знак «Осторожно, скользкий пол»','Порядок на рабочем месте (ПМ)','Опасное условие (ОУ)','Механические опасности','Установить предупреждающий знак',10,'in_progress'),
 (88,1,'Работники используют СИЗ в полном объёме, порядок на участке','ППП','Безопасное действие (БД)','Механические опасности','Отметить положительный опыт на планёрке',-10,'closed'),
 (89,1,'Не промаркирована ёмкость с химическим веществом','Безопасность на рабочем месте (БМ)','Опасное условие (ОУ)','Химические вещества','Нанести маркировку, обновить паспорт безопасности',7,'new'),
 (89,2,'Огнетушитель с истёкшим сроком поверки','Безопасность на рабочем месте (БМ)','Опасное условие (ОУ)','Механические опасности','Заменить огнетушитель',4,'new'),
 (90,1,'Инструмент хранится вне отведённого места','Порядок на рабочем месте (ПМ)','Опасное действие (ОД)','Механические опасности','Организовать место хранения, провести беседу',-1,'in_progress')
) AS o(rid,n,descr,cat,cond,haz,meas,dl,st) ON o.rid = r.id - 0
WHERE r.organization_id = 5 AND NOT EXISTS (SELECT 1 FROM t_p80499285_psot_realization_pro.pab_observations x WHERE x.pab_record_id = r.id);

INSERT INTO t_p80499285_psot_realization_pro.production_control_violations
(report_id, item_number, description, measures, responsible_user_id, deadline, status)
SELECT v.rid, v.n, v.descr, v.meas, 87, CURRENT_DATE + v.dl, v.st
FROM (VALUES
 (31,1,'Отсутствует журнал проверки состояния грузоподъёмных механизмов','Завести журнал, назначить ответственного',6,'new'),
 (31,2,'Не обеспечен свободный доступ к первичным средствам пожаротушения','Освободить подходы к пожарному щиту',3,'new'),
 (32,1,'Станок без исправного защитного ограждения','Установить ограждение, провести внеплановый инструктаж',-3,'in_progress'),
 (32,2,'Просрочена проверка заземления оборудования','Выполнить замеры сопротивления заземления',12,'in_progress'),
 (33,1,'Нарушены правила штабелирования материалов на складе','Переложить материалы, нанести разметку высоты штабеля',-8,'completed'),
 (33,2,'Не проведён инструктаж по охране труда у нового работника','Провести инструктаж и сделать запись в журнале',2,'new')
) AS v(rid,n,descr,meas,dl,st)
WHERE NOT EXISTS (SELECT 1 FROM t_p80499285_psot_realization_pro.production_control_violations x WHERE x.report_id = v.rid);

WITH p AS (
  INSERT INTO t_p80499285_psot_realization_pro.production_prescriptions
  (issuer_fio, issuer_position, issuer_department, issuer_organization, assigned_user_id, assigned_user_fio, created_at)
  SELECT 'Иванов Иван Иванович', 'Главный инженер', 'Отдел охраны труда', 'ДЕМО: ООО "Западная Нефтяная Компания"', 87, 'Демо Пользователь', CURRENT_TIMESTAMP - (g || ' days')::interval
  FROM generate_series(1,3) g
  WHERE NOT EXISTS (SELECT 1 FROM t_p80499285_psot_realization_pro.production_prescriptions WHERE assigned_user_id = 87)
  RETURNING id, created_at
)
INSERT INTO t_p80499285_psot_realization_pro.production_prescription_violations
(prescription_id, violation_text, assigned_user_id, assigned_user_fio, status, deadline, completed_at, confirmed_by_issuer)
SELECT p.id, v.txt, 87, 'Демо Пользователь', v.st, CURRENT_DATE + v.dl, v.comp, v.conf
FROM (SELECT id, row_number() OVER (ORDER BY id) rn FROM p) p
JOIN (VALUES
 (1,'Устранить течь масла на компрессорной установке','in_work',6,NULL::timestamp,false),
 (1,'Обновить схемы эвакуации на 2 этаже','in_work',14,NULL::timestamp,false),
 (2,'Провести обучение по работе на высоте','completed',-5,CURRENT_TIMESTAMP - interval '6 days',true),
 (2,'Заменить освещение в цехе №1','in_work',-4,NULL::timestamp,false),
 (3,'Организовать площадку для сбора отходов','in_work',9,NULL::timestamp,false),
 (3,'Выдать работникам смены зимнюю спецодежду','completed',-1,CURRENT_TIMESTAMP - interval '2 days',false)
) AS v(rn,txt,st,dl,comp,conf) ON v.rn = p.rn;
