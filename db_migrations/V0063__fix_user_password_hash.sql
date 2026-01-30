-- Обновляем хеш пароля для пользователя A.M.Anikin@zapadnaya.ru
-- Убираем пробел в конце пароля, исправляя хеш с учетом trim
UPDATE t_p80499285_psot_realization_pro.users 
SET password_hash = '24f23d9134792899a6c8eb7c508e3715d7c7cceaca55e46515e5415d6597cd02'
WHERE email = 'A.M.Anikin@zapadnaya.ru';
