-- Remove organization link from admin account
-- Main admin should not be tied to any specific organization

UPDATE t_p80499285_psot_realization_pro.users 
SET organization_id = NULL, company = 'Главный администратор'
WHERE role = 'admin' AND email = 'Gl.adm@adm.ru';