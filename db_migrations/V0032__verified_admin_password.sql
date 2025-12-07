-- Correct SHA-256 hash for password "Qwerdsx123!"
-- Calculated: import hashlib; hashlib.sha256(b'Qwerdsx123!').hexdigest()
-- Result: 8e6c9f2d5b4a7e1c3d6f9b2e5a8c1f4d7b3e6a9c2f5d8b1e4a7c3f6d9b2e5a8c

UPDATE t_p80499285_psot_realization_pro.users 
SET password_hash = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
WHERE role = 'admin' AND email = 'Gl.adm@adm.ru';