-- Update password to !23Qazxcvbnm for user K.A.Shnyukov@zapadnaya.ru
-- Using simple SHA256 (without salt) to match auth logic
-- Hash computed as: sha256('!23Qazxcvbnm') = 33422ebac6870a805fc990fba97186143b7a52045596a282b193f6505e8690e0

UPDATE users 
SET password_hash = '33422ebac6870a805fc990fba97186143b7a52045596a282b193f6505e8690e0'
WHERE email = 'K.A.Shnyukov@zapadnaya.ru';