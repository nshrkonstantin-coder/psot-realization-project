-- Update admin password with correct SHA-256 hash
-- Password: Qwerdsx123!
-- Hash: f79e66e2bc4f71c5fdebc7bda003e396385ee15f89d2e389c6f97b73e8fd5d71

UPDATE t_p80499285_psot_realization_pro.users 
SET password_hash = 'f79e66e2bc4f71c5fdebc7bda003e396385ee15f89d2e389c6f97b73e8fd5d71'
WHERE role = 'admin' AND email = 'Gl.adm@adm.ru';