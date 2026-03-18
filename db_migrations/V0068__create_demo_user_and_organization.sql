-- Создаем демо-организацию
INSERT INTO t_p80499285_psot_realization_pro.organizations (name, registration_code, subscription_type, is_active)
VALUES ('ДЕМО: ООО "Западная Нефтяная Компания"', 'DEMO2024', 'demo', true)
ON CONFLICT DO NOTHING;

-- Создаем демо-пользователя с ролью 'demo'
-- Пароль: demo (sha256 = 62d5b1a98c5...  = sha256('demo'))
INSERT INTO t_p80499285_psot_realization_pro.users (email, password_hash, fio, company, subdivision, position, role, organization_id)
SELECT 
  'demo@demo.ru',
  '37268335dd6931045bdcdf92623ff819a64244b53d0e746d438797349d4da578',
  'Демо Пользователь',
  'ДЕМО: ООО "Западная Нефтяная Компания"',
  'Отдел охраны труда',
  'Специалист ОТ',
  'demo',
  o.id
FROM t_p80499285_psot_realization_pro.organizations o
WHERE o.registration_code = 'DEMO2024'
ON CONFLICT (email) DO UPDATE SET role = 'demo', password_hash = '37268335dd6931045bdcdf92623ff819a64244b53d0e746d438797349d4da578';