-- Создаем организацию "Администрация"
INSERT INTO t_p80499285_psot_realization_pro.organizations 
(name, registration_code, created_at, subscription_type, is_active)
VALUES ('Администрация', 'ADMIN001', NOW(), 'premium', true);

-- Создаем администратора с ID=1
INSERT INTO t_p80499285_psot_realization_pro.users 
(id, email, password_hash, fio, company, subdivision, position, role, organization_id, created_at)
VALUES (
  1, 
  'ACYBT@yandex.ru',
  '$2b$10$defaulthashfortemporaryaccess',
  'Ситников Константин Анатольевич',
  'Администрация',
  '',
  'Администратор',
  'admin',
  (SELECT id FROM t_p80499285_psot_realization_pro.organizations WHERE name = 'Администрация' LIMIT 1),
  NOW()
);