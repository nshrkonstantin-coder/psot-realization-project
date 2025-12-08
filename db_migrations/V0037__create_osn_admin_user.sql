-- Создание пользователя Osn.adm@adm.ru с правами admin
INSERT INTO t_p80499285_psot_realization_pro.users 
  (email, password_hash, fio, role, company, subdivision, position, created_at)
VALUES 
  ('Osn.adm@adm.ru', 
   '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', -- хеш для пароля "admin123"
   'Основной Администратор Системный',
   'admin',
   'Администрация',
   'IT отдел',
   'Администратор',
   NOW());