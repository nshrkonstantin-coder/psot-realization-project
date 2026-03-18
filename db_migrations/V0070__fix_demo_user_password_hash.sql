-- Обновляем пароль демо-пользователя на "demo" (SHA-256)
UPDATE t_p80499285_psot_realization_pro.users
SET password_hash = '2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea'
WHERE email = 'demo@demo.ru';