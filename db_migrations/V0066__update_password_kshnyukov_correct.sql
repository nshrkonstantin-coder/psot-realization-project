-- Update password to !23Qazxcvbnm for user K.A.Shnyukov@zapadnaya.ru
-- New hash: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918 (password: "!23Qazxcvbnm")

UPDATE users 
SET password_hash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
WHERE email = 'K.A.Shnyukov@zapadnaya.ru';