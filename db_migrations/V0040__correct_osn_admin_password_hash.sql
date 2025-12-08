-- Исправление хеша пароля для Osn.adm@adm.ru
-- Правильный SHA256 для пароля "123!!"
UPDATE t_p80499285_psot_realization_pro.users 
SET password_hash = '8bb0cf6eb9b17d0f7d22b456f121257dc1254e1f01665370476383ea776df414'
WHERE email = 'Osn.adm@adm.ru';