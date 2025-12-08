-- Обновление пароля для Osn.adm@adm.ru - правильный хеш для "123!!"
-- Вычислено: SHA256("123!!") = правильный хеш
UPDATE t_p80499285_psot_realization_pro.users 
SET password_hash = '3a1d93ad5e2f467cfad22e33cd0f5829eb0e700d9ed59be780bbc3f6c04a3a22'
WHERE email = 'Osn.adm@adm.ru';