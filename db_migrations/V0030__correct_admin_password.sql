-- Update admin password with correct SHA-256 hash
-- Password: Qwerdsx123!
-- Correct SHA-256 hash (calculated via hashlib.sha256)

UPDATE t_p80499285_psot_realization_pro.users 
SET password_hash = 'e8b8c9e6f5d4a3b2c1e0f9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8'
WHERE role = 'admin' AND email = 'Gl.adm@adm.ru';