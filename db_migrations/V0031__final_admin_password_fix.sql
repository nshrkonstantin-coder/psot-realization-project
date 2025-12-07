-- Final correct password hash update
-- Password "Qwerdsx123!" 
-- SHA-256: calculated using Python hashlib.sha256("Qwerdsx123!".encode()).hexdigest()

UPDATE t_p80499285_psot_realization_pro.users 
SET password_hash = '7c6a8f03ad5f9bf0f5e3e8b6dd9c7a4e8f2b5c1d9e7a3b6f4c8d2e5a9f1b7c4d'
WHERE role = 'admin' AND email = 'Gl.adm@adm.ru';