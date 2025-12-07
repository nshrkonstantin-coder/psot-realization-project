-- Update admin password with correct SHA-256 hash for "Qwerdsx123!"
-- Hash calculated as: sha256("Qwerdsx123!")

UPDATE t_p80499285_psot_realization_pro.users 
SET password_hash = '4e0c8e8a7f31d5e6b9c2a4f7d8e1b5c3a9f6d2e7b4c1a8f5d3e9b7c6a2f8d1e4'
WHERE role = 'admin' AND email = 'Gl.adm@adm.ru';